import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import type { PublicAnswer } from "../../apps/api/answers/answer-contract.js";
import type { AnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { createApi } from "../../apps/api/app/create-api.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createDevelopmentDocumentMemory } from "../../apps/api/documents/development-document-memory.js";
import { createDevelopmentDocumentUploadRepository } from "../../apps/api/documents/development-document-upload-repository.js";
import { extractPdfTextByPage } from "../../apps/api/documents/extract-pdf-text.js";
import type { RegisteredDocument } from "../../apps/api/documents/document-catalog.js";
import type { OcrAdapter } from "../../apps/api/documents/ocr-quality.js";
import type { DocumentSourceReader } from "../../apps/api/documents/document-source.js";
import type {
  PrivateDocumentStorage,
  PrivateDocumentReader
} from "../../apps/api/documents/private-document-storage.js";
import type { AnalysisDocument } from "../../apps/api/analysis/document-analysis-reader.js";
import {
  createUserId,
  resolveAuthorizedCondominiumContext
} from "../../apps/api/identity/authorized-condominium-context.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createInMemoryScopedRetrievalIndex } from "../../apps/api/retrieval/in-memory-scoped-retrieval.js";
import type { RetrievableChunk } from "../../apps/api/retrieval/retrieval-contract.js";
import { createScopedTextRetriever } from "../../apps/api/retrieval/text-retrieval.js";
import {
  createFullPageDocumentCorpus,
  renderFullPagePdf,
  type FullPageDocument
} from "../../tests/fixtures/full-page-documents.js";
import { verifyTurnResponse, type GatewayCapture } from "../conversations/replay.js";
import { assessPageAnswer, type PageEval } from "./protocol.js";

const now = () => new Date("2026-11-03T12:00:00.000Z");
const headers = { "x-development-user-id": "sindico-demo" };
export type PreparedDocument = Readonly<{
  key: string;
  title: string;
  pageCount: number;
  pdfSha256: string;
  documentId: string;
  documentVersionId: string;
  pages: AnalysisDocument["pages"];
  chunks: readonly RetrievableChunk[];
  catalogEntry: RegisteredDocument;
}>;

export async function prepareDocument(
  document: FullPageDocument<number>,
  options: {
    validityConfirmed?: boolean;
    content?: Buffer;
    ocrAdapter?: OcrAdapter;
    verifyText?: boolean;
  } = {}
): Promise<PreparedDocument> {
  const memory = createDevelopmentDocumentMemory(
    [],
    options.ocrAdapter ? { ocrAdapter: options.ocrAdapter } : {}
  );
  const repository = createDevelopmentDocumentUploadRepository();
  const memberships = createDevelopmentIdentityRepository();
  const originals = new Map<string, Buffer>();
  const storage: PrivateDocumentStorage & PrivateDocumentReader = {
    async storeOriginal(input) {
      originals.set(`${input.condominiumId}/${input.objectId}`, input.content);
      return { storageKey: input.objectId };
    },
    async removeOriginal(input) {
      originals.delete(`${input.condominiumId}/${input.objectId}`);
    },
    async readOriginal(input) {
      const content = originals.get(`${input.condominiumId}/${input.objectId}`);
      if (!content) throw new Error("Original fictício ausente.");
      return content;
    }
  };
  const app = createApi({
    now,
    membershipRepository: memberships,
    documentCatalogRepository: repository,
    documentUploadRepository: repository,
    developmentDocumentMemory: memory,
    documentStorage: storage
  });
  try {
    const content = options.content ?? renderFullPagePdf(document);
    const uploaded = await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/documents",
      headers: {
        ...headers,
        "content-type": "application/pdf",
        "x-document-title": encodeURIComponent(document.title),
        "x-document-type": "other",
        "x-document-validity-confirmed": options.validityConfirmed === false ? "false" : "true"
      },
      payload: content
    });
    if (uploaded.statusCode !== 202) throw new Error("Falha no envio do PDF fictício.");
    const record = uploaded.json<{ documentId: string; documentVersionId: string }>();
    const original = await app.inject({
      url: `/v1/condominiums/alameda/documents/${record.documentVersionId}/file`,
      headers
    });
    if (original.statusCode !== 200 || !original.rawPayload.equals(content))
      throw new Error("Original diferente após envio.");
    const context = await resolveAuthorizedCondominiumContext(memberships, {
      condominiumId: createCondominiumId("alameda"),
      userId: createUserId("sindico-demo"),
      now: now()
    });
    const deadline = Date.now() + 10_000;
    while (true) {
      const status = (await repository.listAuthorized(context))[0];
      if (status?.processingStatus === "ready") break;
      if (
        ["needs_review", "failed"].includes(status?.processingStatus ?? "") ||
        Date.now() > deadline
      )
        throw new Error("PDF fictício não ficou integralmente pronto.");
      await delay(20);
    }
    const documents = await memory.analysisReader.readAuthorized(context, [
      record.documentVersionId
    ]);
    // Minuta pendente não entra no leitor de análise confirmada. Conferir o original
    // privado já autorizado sem promover sua vigência; seus chunks continuam pending.
    const pages =
      options.validityConfirmed === false
        ? await extractPdfTextByPage(original.rawPayload)
        : documents[0]?.pages;
    if (
      !pages ||
      pages.length !== document.pageCount ||
      pages.some(
        (page, index) =>
          page.pageNumber !== index + 1 ||
          (options.verifyText !== false &&
            page.extractedText !== document.pages[index]!.expectedText)
      )
    )
      throw new Error("Texto ou ordem das páginas diverge do corpus.");
    const chunks = (
      await memory.index.findAuthorizedCandidates(context, {
        query: "Alameda",
        limit: 1000,
        minimumQualityScore: 0.7,
        asOf: now()
      })
    ).map((chunk) => ({ ...chunk, semanticScore: null }));
    if (new Set(chunks.map((chunk) => chunk.pageNumber)).size !== document.pageCount)
      throw new Error("Índice com páginas faltantes.");
    return {
      key: document.id,
      title: document.title,
      pageCount: document.pageCount,
      pdfSha256: createHash("sha256").update(content).digest("hex"),
      ...record,
      pages,
      chunks,
      catalogEntry: (await repository.listAuthorized(context)).find(
        (d) => d.documentVersionId === record.documentVersionId
      )!
    };
  } finally {
    await app.close();
  }
}

export async function prepareCorpus(): Promise<readonly PreparedDocument[]> {
  const result: PreparedDocument[] = [];
  for (const document of createFullPageDocumentCorpus())
    result.push(await prepareDocument(document));
  return result;
}

function sourceReader(document: PreparedDocument): DocumentSourceReader {
  return {
    async getAuthorizedPage(context, input) {
      if (
        context.condominiumId !== "alameda" ||
        !context.permissions.includes("document:read") ||
        input.documentId !== document.documentId ||
        input.documentVersionId !== document.documentVersionId
      )
        return undefined;
      const page = document.pages.find((page) => page.pageNumber === input.page);
      return (
        page && {
          documentId: document.documentId,
          documentVersionId: document.documentVersionId,
          title: document.title,
          page: page.pageNumber,
          content: page.extractedText
        }
      );
    }
  };
}

export async function replayPage(
  testCase: PageEval,
  document: PreparedDocument,
  gateway: AnswerGateway
) {
  const captures: GatewayCapture[] = [];
  const persistence = createInMemoryAnswerPersistence(undefined, now);
  const retriever = createScopedTextRetriever(createInMemoryScopedRetrievalIndex(document.chunks));
  const reader = sourceReader(document);
  const app = createApi({
    now,
    membershipRepository: createDevelopmentIdentityRepository(),
    retriever,
    documentSourceReader: reader,
    answerUseCase: createAnswerUseCase({
      now,
      persistence,
      retriever,
      chatMemoryEnabled: false,
      gateway: {
        async generate(input) {
          const capture: GatewayCapture = { input, telemetry: null };
          captures.push(capture);
          const generated = await gateway.generate(input);
          capture.telemetry = generated.telemetry;
          return generated;
        }
      }
    })
  });
  try {
    const started = Date.now();
    const response = await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/questions",
      headers,
      payload: { question: testCase.question }
    });
    const body = response.json();
    const publicAnswer = response.statusCode === 200 ? (body as PublicAnswer) : null;
    const saved = publicAnswer && persistence.getInteraction(publicAnswer.answerId);
    const mechanicalErrors = [
      ...(await verifyTurnResponse({
        tenant: "alameda",
        statusCode: response.statusCode,
        expectedStatus: 200,
        body,
        gatewayCalls: captures,
        persistedClaims: saved?.claims ?? [],
        sourceReader: reader
      }))
    ];
    const evidence = captures.at(-1)?.input.evidence ?? [];
    if (
      evidence.some(
        (source) =>
          source.documentId !== document.documentId ||
          source.documentVersionId !== document.documentVersionId
      )
    )
      mechanicalErrors.push("unexpected_document_in_gateway");
    return {
      testCase,
      document: {
        key: document.key,
        documentId: document.documentId,
        documentVersionId: document.documentVersionId,
        pdfSha256: document.pdfSha256
      },
      statusCode: response.statusCode,
      response: publicAnswer,
      httpBody: body,
      latencyMs: Date.now() - started,
      gatewayCalls: captures,
      validationFailures:
        saved?.invocations.flatMap((item) => (item.errorCode ? [item.errorCode] : [])) ?? [],
      assessment: assessPageAnswer(testCase, publicAnswer, evidence, mechanicalErrors)
    };
  } finally {
    await app.close();
  }
}
