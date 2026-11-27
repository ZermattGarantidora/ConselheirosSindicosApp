import type { AnswerGatewayInput } from "./answer-gateway.js";
import { InvalidAnswerValidationError } from "./citation-validator.js";
import { mkdir, lstat, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type CodexReferenceFormat = "original" | "compact-v1";

/** Diretório genérico sem dados: schema e payload nunca são gravados neste cwd. */
export async function codexCacheContextDirectory() {
  const directory = join(tmpdir(), "alvitra-codex-empty-context-v1");
  try {
    await mkdir(directory, { mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const stat = await lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (await readdir(directory)).length > 0)
    throw new Error("Diretório genérico do Codex não está vazio ou isolado.");
  return directory;
}

export function codexReferenceFormat(value: string | undefined): CodexReferenceFormat {
  const format = value?.trim() || "original";
  if (format !== "original" && format !== "compact-v1")
    throw new Error("CODEX_ANSWER_REFERENCE_FORMAT deve ser original ou compact-v1.");
  return format;
}

/** Bijeção efêmera: somente referências estruturadas mudam, nunca textos ou fontes. */
export function codexReferenceLayout(input: AnswerGatewayInput, format: CodexReferenceFormat) {
  if (format === "original" || input.evidence.length === 0)
    return { input, decode: (text: string) => text };
  if (
    new Set(input.evidence.map((e) => e.id)).size !== input.evidence.length ||
    new Set(input.evidence.map((e) => e.condominiumId)).size !== 1
  )
    throw new Error("Conjunto de evidências inválido para tradução local.");
  const forward = new Map(input.evidence.map((e, i) => [e.id, `e${i + 1}`]));
  const reverse = new Map([...forward].map(([id, alias]) => [alias, id]));
  const encode = (id: string) => forward.get(id) ?? id;
  const contract = input.conversationContext?.taskFocus?.validationContract;
  const context = input.conversationContext;
  const wire: AnswerGatewayInput = {
    ...input,
    evidence: input.evidence.map((e) => ({ ...e, id: forward.get(e.id)! })),
    ...(context && contract
      ? {
          conversationContext: {
            ...context,
            taskFocus: {
              ...context.taskFocus!,
              validationContract: {
                ...contract,
                availableEvidenceIds: contract.availableEvidenceIds.map(encode),
                conflictEvidenceIds: contract.conflictEvidenceIds.map(encode),
                pendingEvidenceIds: contract.pendingEvidenceIds.map(encode),
                ...(contract.conditionalConflict
                  ? {
                      conditionalConflict: {
                        ...contract.conditionalConflict,
                        evidenceIds: contract.conditionalConflict.evidenceIds.map(encode)
                      }
                    }
                  : {})
              }
            }
          }
        }
      : {})
  };
  function decodeId(value: unknown): string {
    const id = typeof value === "string" ? reverse.get(value) : undefined;
    if (!id)
      throw new InvalidAnswerValidationError(
        "A citação aponta para uma evidência não autorizada.",
        "citation_not_authorized"
      );
    return id;
  }
  return {
    input: wire,
    decode(text: string): string {
      const value = JSON.parse(text) as Record<string, unknown>;
      if (value === null || typeof value !== "object" || Array.isArray(value)) return text;
      if (typeof value.answer === "string") {
        for (const alias of reverse.keys()) {
          const marker = new RegExp(`\\b${alias}\\b`, "iu");
          if (
            marker.test(value.answer) &&
            !marker.test(input.question) &&
            !input.evidence.some((e) => marker.test(e.content))
          )
            throw new InvalidAnswerValidationError(
              "A resposta expôs uma referência interna de evidência.",
              "answer_body_internal_reference"
            );
        }
      }
      return JSON.stringify({
        ...value,
        ...(Array.isArray(value.citations)
          ? {
              citations: value.citations.map((c: { evidenceId?: unknown }) => ({
                ...c,
                evidenceId: decodeId(c?.evidenceId)
              }))
            }
          : {}),
        ...(Array.isArray(value.claims)
          ? {
              claims: value.claims.map((c: { citationEvidenceIds?: unknown }) => ({
                ...c,
                ...(Array.isArray(c?.citationEvidenceIds)
                  ? { citationEvidenceIds: c.citationEvidenceIds.map(decodeId) }
                  : {})
              }))
            }
          : {})
      });
    }
  };
}
