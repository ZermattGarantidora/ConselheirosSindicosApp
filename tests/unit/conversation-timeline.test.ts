import { describe, expect, it, vi } from "vitest";
import {
  loadTimeline,
  mergeTimeline,
  recoverSetup,
  recordedDocumentUploads,
  refreshTimeline,
  type TimelineEntry
} from "../../apps/web/conversation-timeline.js";
const entry = (sequence: number, setup: Record<string, unknown> = {}): TimelineEntry => ({
  id: String(sequence),
  sequence,
  createdAt: "2026-10-30T12:00:00.000Z",
  messages: [],
  metadata: { setup }
});
describe("Spec 058 — recuperação da conversa na interface", () => {
  it("AC-5814: identifica uploads pelo ID da mensagem e versão, sem fundir nomes iguais", () => {
    const first: TimelineEntry = {
      ...entry(1),
      metadata: { documentVersionId: "v1" },
      messages: [
        { id: "upload-1", role: "user", kind: "upload", text: "Ata.pdf" },
        { id: "text-1", role: "user", kind: "document_status", text: "Ata.pdf" },
        { id: "assistant-1", role: "assistant", kind: "upload", text: "Ata.pdf" }
      ]
    };
    const second: TimelineEntry = {
      ...entry(2),
      metadata: { documentVersionId: "v2" },
      messages: [{ id: "upload-2", role: "user", kind: "upload", text: "Ata.pdf" }]
    };
    const unknown: TimelineEntry = { ...first, id: "unknown", metadata: {} };
    expect([...recordedDocumentUploads([first, second, unknown], "alameda")]).toEqual([
      ["upload-1", { condominiumId: "alameda", documentVersionId: "v1", title: "Ata.pdf" }],
      ["upload-2", { condominiumId: "alameda", documentVersionId: "v2", title: "Ata.pdf" }]
    ]);
    expect(recordedDocumentUploads([first], undefined).size).toBe(0);
    expect(recordedDocumentUploads([], "bosque").size).toBe(0);
  });

  it("correções de nome/quantidade não encerram outra etapa em andamento", () => {
    expect(
      recoverSetup([
        entry(1, {
          stage: "unit_count",
          hasExistingContext: true,
          update: { field: "manager_name", value: "Pessoa Fictícia" }
        })
      ]).stage
    ).toBe("unit_count");
    expect(
      recoverSetup([
        entry(1, { stage: "unit_count", update: { field: "condominium_count", value: 2 } })
      ]).stage
    ).toBe("unit_count");
  });
  it("atualização após muitas mensagens em outra aba deixa a lacuna paginável", () => {
    const previous = { entries: [entry(1), entry(2)], nextCursor: null };
    const refreshed = refreshTimeline(previous, {
      entries: [entry(100), entry(101)],
      nextCursor: "lacuna",
      durable: true
    });
    expect(refreshed.nextCursor).toBe("lacuna");
    expect(refreshed.entries.map((item) => item.id)).toEqual(["1", "2", "100", "101"]);
    expect(
      refreshTimeline(previous, {
        entries: [entry(2), entry(3)],
        nextCursor: "ja-lido",
        durable: true
      }).nextCursor
    ).toBeNull();
  });
  it("reconstrói somente valores confirmados, sem regenerar mensagens", () => {
    const recovered = recoverSetup([
      entry(1, {
        stage: "manager_name",
        update: { field: "manager_name", value: "Pessoa Fictícia" }
      }),
      entry(2, { update: { field: "condominium_count", value: 1 } }),
      entry(3, { update: { field: "condominium_name", value: "Condomínio FICTÍCIO" } }),
      entry(4, { update: { field: "unit_count", value: 17 } })
    ]);
    expect(recovered).toMatchObject({
      managerName: "Pessoa Fictícia",
      condominiumName: "Condomínio FICTÍCIO",
      count: 1,
      stage: "unit_count",
      unitCount: 17
    });
    expect(recovered.createdContext).toBeUndefined();
  });
  it("recibo de criação permite retomar o contexto original", () => {
    expect(
      recoverSetup([{ ...entry(1), metadata: { createdContext: { condominiumId: "ficticio" } } }])
    ).toMatchObject({ createdContext: { condominiumId: "ficticio" }, stage: "complete" });
  });
  it("mescla páginas/repetições sem perder ordem no mesmo milissegundo", () => {
    expect(
      mergeTimeline([entry(3), entry(2)], [entry(1), entry(2)]).map((item) => item.id)
    ).toEqual(["1", "2", "3"]);
  });
  it("consulta usa conta ou escopo codificado e falha explícita preservável", async () => {
    const request = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify({ entries: [], nextCursor: null, durable: true }))
    );
    await loadTimeline(request, { authorization: "synthetic" });
    expect(request.mock.calls[0]?.[0]).toContain("/v1/chat/setup-history");
    await loadTimeline(request, {}, { condominiumId: "c/1", chatId: "h/2" }, "cursor+");
    expect(request.mock.calls[1]?.[0]).toContain(
      "c%2F1/chats/h%2F2/messages?limit=50&before=cursor%2B"
    );
    await expect(loadTimeline(async () => new Response("{}", { status: 503 }), {})).rejects.toThrow(
      "preservadas"
    );
  });
});
