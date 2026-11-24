import { createHash } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import {
  AnswerGatewayUnavailableError,
  type AnswerGateway,
  type AnswerGatewayInput
} from "./answer-gateway.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import { createOpenAiAnswerGateway } from "./openai-answer-gateway.js";
import { validateGeneratedAnswer } from "./citation-validator.js";
import { enforceHighRiskSpecialist } from "./answer-risk-policy.js";
import { classifyQuestionRisk } from "./risk-classification.js";
import { answerPromptVersion } from "./prompt-catalog.js";
import { answerPipelineVersion } from "./answer-contract.js";
import type { HostedReplayProof } from "../app/journal-replay-proof.js";
import { hostedDocumentRequestHash } from "../documents/hosted-document-execution.js";
import {
  createHostedDocumentExecutor,
  hostedDocumentDestination,
  hostedDocumentTransportConfigured,
  type HostedDocumentTransferAuthorizer,
  type HostedDocumentCallControl
} from "../documents/hosted-document-execution.js";

export type HostedDocumentBatchGatewayFactory = ((
  context: AuthorizedCondominiumContext,
  chatId: string
) => AnswerGateway & { replayProof?: () => HostedReplayProof | undefined }) & {
  revalidateReplay?: (
    context: AuthorizedCondominiumContext,
    chatId: string,
    proof: HostedReplayProof
  ) => Promise<boolean>;
};

/** Transporte é injetado; startup não fornece autorizador ou destino de envio real. */
export function createHostedDocumentBatchGatewayFactory(
  options: Readonly<{
    apiKey: string;
    fetch?: typeof globalThis.fetch;
    authorize?: HostedDocumentTransferAuthorizer;
    callControl?: HostedDocumentCallControl;
    syntheticContractOnly?: boolean;
  }>
): HostedDocumentBatchGatewayFactory {
  if (!hostedDocumentTransportConfigured(options))
    return () => ({
      generate: async () => {
        throw new AnswerGatewayUnavailableError();
      }
    });
  const gateway = createOpenAiAnswerGateway({
    apiKey: options.apiKey,
    model: "gpt-6.1-sol",
    reasoningEffort: "low",
    timeoutMs: 60_000,
    ...(options.fetch === undefined ? {} : { fetch: options.fetch })
  });
  const execution = new AsyncLocalStorage<{ proof?: HostedReplayProof }>();
  const executor = createHostedDocumentExecutor({
    ...(options.callControl === undefined ? {} : { callControl: options.callControl }),
    authorize: async (request) => {
      const decision = (await options.authorize?.(request)) ?? { allowed: false as const };
      const current = execution.getStore();
      if (
        current &&
        decision.allowed &&
        decision.requestHash === hostedDocumentRequestHash(request)
      )
        current.proof = structuredClone({ request, policyRevision: decision.policyRevision });
      return decision;
    }
  });
  const factory: HostedDocumentBatchGatewayFactory = (originalContext, chatId) => {
    const context = structuredClone(originalContext);
    let proof: HostedReplayProof | undefined;
    return {
      replayProof: () => (proof === undefined ? undefined : structuredClone(proof)),
      async generate(input: AnswerGatewayInput) {
        const { signal: callerSignal, ...originalPayload } = input;
        // O payload efetivo não pode mudar depois de autorizado ou durante espera/cache.
        input = structuredClone(originalPayload);
        if (
          !context.permissions.includes("document:read") ||
          !chatId ||
          input.task !== "grounded_answer" ||
          input.evidence.length === 0 ||
          input.evidence.some((item) => item.condominiumId !== context.condominiumId) ||
          !Number.isInteger(input.budget.maximumOutputTokens) ||
          input.budget.maximumOutputTokens < 1 ||
          input.budget.maximumOutputTokens > 1200
        )
          throw new AnswerGatewayUnavailableError();
        const versions = new Map<string, Array<(typeof input.evidence)[number]>>();
        const pages = new Set<string>();
        let characters = 0;
        for (const item of input.evidence) {
          const group = versions.get(item.documentVersionId) ?? [];
          group.push(item);
          versions.set(item.documentVersionId, group);
          pages.add(JSON.stringify([item.documentVersionId, item.pageNumber]));
          characters += item.content.length;
        }
        if (versions.size > 50 || pages.size > 500 || characters > 120_000)
          throw new AnswerGatewayUnavailableError();
        const serialized = JSON.stringify(input);
        try {
          const current: { proof?: HostedReplayProof } = {};
          const result = await execution.run(current, () =>
            executor.execute(
              {
                purpose: "batch_synthesis",
                destination: hostedDocumentDestination,
                model: "gpt-6.1-sol",
                condominiumId: context.condominiumId,
                userId: context.userId,
                chatId,
                membershipRevision: context.membershipRevision,
                documentVersions: [...versions].map(([id, evidence]) => ({
                  id,
                  contentKind: "evidence_bundle",
                  contentSha256: createHash("sha256").update(JSON.stringify(evidence)).digest("hex")
                })),
                payloadSha256: createHash("sha256").update(serialized).digest("hex"),
                inputBytes: Buffer.byteLength(serialized),
                pageCount: pages.size,
                maximumOutputTokens: input.budget.maximumOutputTokens,
                processorVersion: `${answerPromptVersion}/${answerPipelineVersion}`
              },
              async (signal) => {
                const result = await gateway.generate({ ...input, signal });
                const output = enforceHighRiskSpecialist(
                  result.output,
                  classifyQuestionRisk(input.evidence.map((item) => item.content).join("\n"))
                );
                const validated = validateGeneratedAnswer(output, input.evidence);
                if (validated.answerMode === "failed") throw new AnswerGatewayUnavailableError();
                return { ...result, output };
              },
              callerSignal
            )
          );
          proof = current.proof;
          return result;
        } catch {
          throw new AnswerGatewayUnavailableError();
        }
      }
    };
  };
  factory.revalidateReplay = async (context, chatId, proof) => {
    try {
      const request = proof.request;
      if (
        !context.permissions.includes("document:read") ||
        request.purpose !== "batch_synthesis" ||
        request.destination !== hostedDocumentDestination ||
        request.model !== "gpt-6.1-sol" ||
        request.processorVersion !== `${answerPromptVersion}/${answerPipelineVersion}` ||
        !request.documentVersions.length ||
        request.documentVersions.length > 50 ||
        !Number.isInteger(request.maximumOutputTokens) ||
        request.maximumOutputTokens < 1 ||
        request.maximumOutputTokens > 1200 ||
        request.condominiumId !== context.condominiumId ||
        request.userId !== context.userId ||
        request.chatId !== chatId ||
        request.membershipRevision !== context.membershipRevision
      )
        return false;
      const decision = await options.authorize?.(structuredClone(request));
      return (
        decision?.allowed === true &&
        decision.requestHash === hostedDocumentRequestHash(request) &&
        decision.policyRevision === proof.policyRevision
      );
    } catch {
      return false;
    }
  };
  return factory;
}
