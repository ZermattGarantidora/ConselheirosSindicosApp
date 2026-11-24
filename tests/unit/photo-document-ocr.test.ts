import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";
import { photoDocumentPdf } from "../../apps/api/documents/photo-document-pdf.js";
import { createHostedDocumentProcessingAdapters as createAdapters } from "../../apps/api/documents/hosted-document-processing.js";
import {
  processDocumentVersion,
  createScopedDocumentProcessor
} from "../../apps/api/documents/document-processing.js";
import { createSyntheticFileHostedCallLedger } from "../../apps/api/documents/synthetic-file-hosted-call-ledger.js";
import { createDocumentVersion } from "../../apps/api/documents/document-model.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import {
  hostedDocumentRequestHash,
  type HostedDocumentTransferAuthorizer
} from "../../apps/api/documents/hosted-document-execution.js";
import {
  syntheticDocumentPng,
  syntheticPhotoTranscript,
  syntheticPngChunk
} from "../fixtures/synthetic-document-photo.js";

const tenant = createCondominiumId("synthetic-photo");
const createHostedDocumentProcessingAdapters = (
  options: Parameters<typeof createAdapters>[0] = {}
) => createAdapters({ ...options, syntheticContractOnly: true });
const allow: HostedDocumentTransferAuthorizer = async (request) => ({
  allowed: true,
  requestHash: hostedDocumentRequestHash(request),
  policyRevision: "synthetic-only"
});
function imageStreams(pdf: Buffer): Buffer[] {
  const result: Buffer[] = [];
  const text = pdf.toString("binary"),
    expression = /\/Subtype \/Image[^]*?\/Length (\d+) >>\nstream\n/gu;
  for (const match of text.matchAll(expression)) {
    const start = match.index! + match[0].length;
    result.push(pdf.subarray(start, start + Number(match[1])));
  }
  return result;
}
const response = (text = syntheticPhotoTranscript, qualityScore = 1, status = "completed") =>
  Response.json({
    status,
    output: [
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text: JSON.stringify({ pages: [{ pageIndex: 0, extractedText: text, qualityScore }] })
          }
        ]
      }
    ]
  });
function input(content: Buffer, mediaType: "image/png" | "image/jpeg") {
  return {
    condominiumId: tenant,
    documentId: "synthetic-document",
    documentVersionId: "synthetic-version",
    content,
    mediaType,
    currentState: createDocumentVersion({
      condominiumId: tenant,
      id: "synthetic-version",
      documentId: "synthetic-document",
      versionNumber: 1,
      contentSha256: createHash("sha256").update(content).digest("hex"),
      mediaType,
      sizeBytes: content.length
    }).state
  };
}

describe("Spec 071 — foto integral em página documental", () => {
  it("AC-7112: worker retoma após falha de persistência sem repetir OCR da mesma versão", async () => {
    const directory = await mkdtemp(join(tmpdir(), "alvitra-photo-worker-ledger-"));
    try {
      const callControl = {
        ledger: createSyntheticFileHostedCallLedger({ directory, confirmation: "synthetic-only" }),
        budget: () => ({
          currency: "USD" as const,
          tariffVersion: "synthetic-only",
          maximumCostMicrounits: 10,
          tenantDailyLimitMicrounits: 10,
          globalDailyLimitMicrounits: 10
        })
      };
      const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => response());
      const adapters = createHostedDocumentProcessingAdapters({
        apiKey: "synthetic-key",
        authorize: allow,
        fetch,
        photoMode: "document",
        callControl
      });
      const original = input(
        await readFile("tests/fixtures/synthetic-document-page.png"),
        "image/png"
      );
      const saveProcessingResult = vi
        .fn()
        .mockRejectedValueOnce(new Error("persistência sintética falhou"))
        .mockResolvedValue(undefined);
      const processor = createScopedDocumentProcessor(
        {
          loadForProcessing: async () => ({ ...original, state: original.currentState }),
          saveProcessingResult
        },
        adapters.ocrAdapter,
        undefined,
        undefined,
        adapters.photoOcrAdapter
      );
      const job = {
        condominiumId: tenant,
        documentVersionId: original.documentVersionId,
        jobId: "synthetic-job",
        attemptCount: 1
      };
      await expect(processor.process(job)).rejects.toThrow("persistência");
      await processor.process({ ...job, attemptCount: 2 });
      expect(fetch).toHaveBeenCalledOnce();
      expect(saveProcessingResult.mock.calls[1]![0].outcome).toMatchObject({
        status: "completed",
        pages: [{ extractedText: syntheticPhotoTranscript }]
      });
    } finally {
      await removeWorkerTestDirectory(directory);
    }
  });
  it("AC-7109: imagens sintéticas e texto de referência têm manifesto verificável", async () => {
    const manifest = JSON.parse(
      await readFile("tests/fixtures/synthetic-document-photo-manifest.json", "utf8")
    );
    expect(manifest.transcriptSha256).toBe(
      createHash("sha256").update(syntheticPhotoTranscript).digest("hex")
    );
    for (const extension of ["jpg", "png"]) {
      const bytes = await readFile(`tests/fixtures/synthetic-document-page.${extension}`);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        manifest[extension === "jpg" ? "jpegSha256" : "pngSha256"]
      );
    }
    expect(manifest.renderedRows).toBeGreaterThan(26);
  });
  it.each([0, 1, 2, 3, 4])(
    "AC-7109: desfaz filtro PNG %s e conserva todos os pixels",
    async (filter) => {
      const pixels = Buffer.from(Array.from({ length: 18 }, (_, i) => (i * 47) % 256));
      const photo = syntheticDocumentPng({ filter, pixels });
      const pdf = photoDocumentPdf(photo, "image/png");
      expect(inflateSync(imageStreams(pdf)[0]!)).toEqual(pixels);
      const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const task = getDocument({ data: new Uint8Array(pdf), stopAtErrors: true });
      try {
        const document = await task.promise;
        expect(document.numPages).toBe(1);
        expect((await document.getPage(1)).view).toEqual([0, 0, 3, 2]);
      } finally {
        await task.destroy();
      }
    }
  );

  it.each([0, 2, 3, 4, 6])("AC-7109: conserva cor e alfa do tipo PNG %s", (color) => {
    const channels = color === 0 || color === 3 ? 1 : color === 2 ? 3 : color === 4 ? 2 : 4;
    const pixels = Buffer.from(
      Array.from({ length: 6 * channels }, (_, i) => (color === 3 ? i % 2 : i + 1))
    );
    const streams = imageStreams(
      photoDocumentPdf(syntheticDocumentPng({ color, pixels }), "image/png")
    );
    const outChannels = color === 0 || color === 4 ? 1 : 3;
    const expected = Buffer.from(
      Array.from({ length: 6 * outChannels }, (_, i) =>
        color === 3
          ? (Math.floor(i / 3) % 2 === 0 ? [255, 0, 0] : [0, 255, 0])[i % 3]!
          : pixels[Math.floor(i / outChannels) * channels + (i % outChannels)]!
      )
    );
    expect(inflateSync(streams[0]!)).toEqual(expected);
    if (color === 4 || color === 6)
      expect(inflateSync(streams[1]!)).toEqual(
        Buffer.from(Array.from({ length: 6 }, (_, i) => pixels[i * channels + outChannels]!))
      );
    else expect(streams).toHaveLength(1);
  });

  it.each([0, 2, 3])("AC-7109: transparência tRNS é preservada no tipo %s", (color) => {
    const transparency =
      color === 0 ? Buffer.from([0, 0]) : color === 2 ? Buffer.alloc(6) : Buffer.from([0, 255]);
    const channels = color === 2 ? 3 : 1;
    const streams = imageStreams(
      photoDocumentPdf(
        syntheticDocumentPng({ color, transparency, pixels: Buffer.alloc(6 * channels) }),
        "image/png"
      )
    );
    expect(inflateSync(streams[1]!)).toEqual(Buffer.alloc(6));
  });

  it("AC-7109: JPEG sintético é conservado inteiro no PDF de uma página", async () => {
    const original = await readFile("tests/fixtures/synthetic-document-page.jpg");
    const pdf = photoDocumentPdf(original, "image/jpeg");
    expect(imageStreams(pdf)[0]).toEqual(original);
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const task = getDocument({ data: new Uint8Array(pdf), stopAtErrors: true });
    try {
      const document = await task.promise;
      expect(document.numPages).toBe(1);
      expect((await document.getPage(1)).view).toEqual([0, 0, 800, 1100]);
    } finally {
      await task.destroy();
    }
  });

  it.each(["image/png", "image/jpeg"] as const)(
    "AC-7109: OCR %s não corta o texto e preserva origem e payload distintos",
    async (mediaType) => {
      const photo = await readFile(
        `tests/fixtures/synthetic-document-page.${mediaType === "image/png" ? "png" : "jpg"}`
      );
      const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => response());
      const authorize = vi.fn(allow);
      const adapters = createHostedDocumentProcessingAdapters({
        apiKey: "synthetic-key",
        authorize,
        fetch,
        photoMode: "document"
      });
      const result = await processDocumentVersion({ ...input(photo, mediaType), ...adapters });
      expect(result.status).toBe("completed");
      expect(result.pages[0]).toMatchObject({
        condominiumId: tenant,
        documentVersionId: "synthetic-version",
        pageNumber: 1,
        extractionMethod: "ocr",
        extractedText: syntheticPhotoTranscript
      });
      expect(result.pages[0]!.extractedText.length).toBeGreaterThan(250);
      expect(result.pages[0]!.contentSha256).toBe(
        createHash("sha256").update(syntheticPhotoTranscript).digest("hex")
      );
      expect(authorize.mock.calls[0]![0]).toMatchObject({
        purpose: "photo_ocr",
        pageCount: 1,
        documentVersions: [{ contentSha256: createHash("sha256").update(photo).digest("hex") }]
      });
      expect(authorize.mock.calls[0]![0].payloadSha256).not.toBe(
        authorize.mock.calls[0]![0].documentVersions[0]!.contentSha256
      );
      const body = JSON.parse(String(fetch.mock.calls[0]![1]!.body));
      expect(body).toMatchObject({ store: false, max_output_tokens: 16000 });
      const pdf = Buffer.from(String(body.input[0].content[1].file_data).split(",")[1]!, "base64");
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(body.input[0].content[0].text).toContain("Transcreva cada página deste PDF");
      expect(fetch).toHaveBeenCalledOnce();
    }
  );

  it.each(["empty", "quality", "incomplete", "numeric", "unavailable"])(
    "AC-7110: foto %s não é publicada como pronta",
    async (kind) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockImplementation(async () =>
          response(
            kind === "empty"
              ? ""
              : kind === "numeric"
                ? "Balancete 10/2026\nReceitas: R$ 8.000,00\nDespesas: R$ 3.000,00"
                : syntheticPhotoTranscript,
            kind === "quality" ? 0.4 : 1,
            kind === "incomplete" ? "incomplete" : "completed"
          )
        );
      const adapters = createHostedDocumentProcessingAdapters({
        apiKey: "synthetic-key",
        ...(kind === "unavailable" ? {} : { authorize: allow }),
        fetch,
        photoMode: "document"
      });
      const result = await processDocumentVersion({
        ...input(syntheticDocumentPng(), "image/png"),
        ...adapters
      });
      expect(result.status).toBe("needs_review");
      if (kind === "numeric") expect(result).toMatchObject({ reason: "ocr_numeric_unverified" });
      if (kind === "unavailable") expect(fetch).not.toHaveBeenCalled();
    }
  );

  it.each(["crc", "depth", "interlace", "pixels", "filter", "truncated", "zip"])(
    "AC-7110: PNG %s falha antes do envio",
    async (kind) => {
      let photo = syntheticDocumentPng({
        ...(kind === "depth" ? { bitDepth: 16 } : {}),
        ...(kind === "interlace" ? { interlace: 1 } : {}),
        ...(kind === "filter" ? { filter: 5 } : {})
      });
      if (kind === "crc") photo[photo.length - 1] = photo[photo.length - 1]! ^ 1;
      if (kind === "truncated") photo = photo.subarray(0, photo.length - 5);
      if (kind === "pixels" || kind === "zip") {
        const header = Buffer.from(photo.subarray(16, 29));
        if (kind === "pixels") {
          header.writeUInt32BE(5000, 0);
          header.writeUInt32BE(5000, 4);
        } else {
          header.writeUInt32BE(1, 0);
          header.writeUInt32BE(1, 4);
        }
        photo = Buffer.concat([
          photo.subarray(0, 8),
          syntheticPngChunk("IHDR", header),
          photo.subarray(33)
        ]);
      }
      expect(() => photoDocumentPdf(photo, "image/png")).toThrow("foto");
      const fetch = vi.fn<typeof globalThis.fetch>();
      const adapters = createHostedDocumentProcessingAdapters({
        apiKey: "synthetic-key",
        authorize: allow,
        fetch,
        photoMode: "document"
      });
      expect(
        (await processDocumentVersion({ ...input(photo, "image/png"), ...adapters })).status
      ).toBe("needs_review");
      expect(fetch).not.toHaveBeenCalled();
    }
  );
});
async function removeWorkerTestDirectory(directory: string) {
  if (
    dirname(resolve(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith("alvitra-photo-worker-ledger-")
  )
    throw new Error("Temporário fora do escopo.");
  await rm(directory, { recursive: true, force: true });
}
