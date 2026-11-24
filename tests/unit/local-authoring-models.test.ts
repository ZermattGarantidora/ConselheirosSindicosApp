import { randomUUID, createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import {
  createLocalCodexAuthoringModels,
  documentPlanSchema
} from "../../apps/api/authoring/codex-authoring-model.js";
import { Ajv } from "ajv";
import {
  createLocalWhisperTranscriber,
  parseWhisperTranscript,
  type WhisperProcess
} from "../../apps/api/authoring/local-whisper-transcriber.js";
import { scrubAuthoringEntry } from "../../apps/api/authoring/authoring-artifacts.js";
import { createInMemoryConversationStore } from "../../apps/api/answers/conversation-store.js";
import type { CodexProcessRequest } from "../../apps/api/answers/codex-process.js";
import type { DocumentDraft } from "../../apps/shared/document-draft.js";
import { createUserId } from "../../apps/api/identity/authorized-condominium-context.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createReplaySafeSyntheticStorage } from "../../evals/authoring-homologation/local-storage.js";
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
it("AC-7328/7346: schema já impede alteração factual/substantiva sem referência, sem proibir redação editorial", () => {
  const validate = new Ajv().compile(documentPlanSchema);
  const plan = {
    version: "document-authoring-v1",
    status: "ready",
    message: "Proposta.",
    title: "FICTÍCIO.",
    documentKind: "Comunicado",
    operation: "create",
    paragraphs: [],
    changes: [
      {
        id: "c1",
        paragraphId: "p1",
        before: null,
        after: "Texto.",
        kind: "factual",
        reason: "Alteração.",
        references: [] as unknown[]
      }
    ],
    coverage: [],
    pending: [],
    requiresSpecialist: false
  };
  expect(validate(plan)).toBe(false);
  plan.changes[0]!.kind = "substantive";
  expect(validate(plan)).toBe(false);
  plan.changes[0]!.kind = "editorial";
  expect(validate(plan)).toBe(true);
  plan.changes[0]!.kind = "factual";
  plan.changes[0]!.references = [{ sourceId: "s1", startOffset: 0, endOffset: 5, quote: "fonte" }];
  expect(validate(plan)).toBe(true);
});
const stdout = (value: unknown) =>
  [
    { type: "thread.started" },
    { type: "turn.started" },
    { type: "item.completed", item: { type: "agent_message", text: JSON.stringify(value) } },
    { type: "turn.completed" }
  ]
    .map((e) => JSON.stringify(e))
    .join("\n");
const scope = {
  kind: "chat" as const,
  userId: createUserId(randomUUID()),
  condominiumId: randomUUID(),
  chatId: randomUUID()
};
const input = {
  phase: "write" as const,
  operationId: "synthetic",
  scope,
  data: { request: "FICTÍCIO. Preparar aviso." },
  signal: new AbortController().signal
};
it("AC-7347: retomada da homologação reaproveita somente original idêntico e não o sobrescreve", async () => {
  const directory = await mkdtemp(join(tmpdir(), "alvitra-synthetic-replay-"));
  try {
    const storage = createReplaySafeSyntheticStorage(directory);
    const original = {
      condominiumId: createCondominiumId(randomUUID()),
      objectId: randomUUID(),
      uploadedByUserId: scope.userId,
      content: Buffer.from("FICTÍCIO. Original.")
    };
    const saved = await storage.storeOriginal(original);
    expect(await storage.storeOriginal(original)).toEqual(saved);
    await expect(
      storage.storeOriginal({ ...original, content: Buffer.from("Outro conteúdo.") })
    ).rejects.toThrow("divergente");
    expect(
      await storage.readOriginal({
        condominiumId: original.condominiumId,
        objectId: original.objectId
      })
    ).toEqual(original.content);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
it.each(["write", "review"] as const)(
  "AC-7346: Codex %s usa sessão do plano, schema, dados e isolamento sem ferramentas",
  async (phase) => {
    const run = vi.fn(async (request: CodexProcessRequest) => {
      const schema = JSON.parse(
        await readFile(request.args[request.args.indexOf("--output-schema") + 1]!, "utf8")
      );
      expect(schema.additionalProperties).toBe(false);
      expect(schema.required).toContain("version");
      return stdout({ synthetic: true });
    });
    const models = createLocalCodexAuthoringModels({ confirmation: "synthetic-local-only", run });
    expect(await models.document.complete({ ...input, phase })).toEqual({ synthetic: true });
    const request = run.mock.calls[0]![0];
    expect(request.args).toEqual(
      expect.arrayContaining([
        "--ephemeral",
        "read-only",
        "--ignore-user-config",
        'forced_login_method="chatgpt"',
        'approval_policy="never"',
        "shell_tool",
        "multi_agent",
        'web_search="disabled"',
        "mcp_servers={}"
      ])
    );
    expect(request.input).toContain(JSON.stringify(input.data));
    expect(request.input).not.toContain("GABARITO");
    expect(request.cwd).not.toBe(process.cwd());
    expect(request.signal).toBe(input.signal);
    await expect(access(request.cwd)).rejects.toThrow();
  }
);
it("AC-7346/7339: conferência de original sem mudança não exige fabricar oferta", async () => {
  const run = vi.fn(async () => stdout({ value: "synthetic" }));
  const models = createLocalCodexAuthoringModels({ confirmation: "synthetic-local-only", run });
  await models.document.complete({
    ...input,
    phase: "review",
    data: { ...input.data, trigger: "original_analysis" }
  });
  expect((run.mock.calls[0] as unknown as [CodexProcessRequest])[0].input).toContain(
    "Não exija pergunta sobre rascunho quando nada mudou"
  );
});
it.each(["write", "review"] as const)(
  "AC-7303/7353/54: %s distingue investigação técnica, redação simples e alteração de obrigações",
  async (phase) => {
    const run = vi.fn(async () => stdout({ synthetic: true }));
    const models = createLocalCodexAuthoringModels({ confirmation: "synthetic-local-only", run });
    await models.document.complete({
      ...input,
      phase,
      data: { request: "Completar quórum; suspeita de vazamento." }
    });
    const prompt = (run.mock.calls[0] as unknown as [CodexProcessRequest])[0].input;
    expect(prompt).toContain("responsável técnico para apurar a causa em pending");
    expect(prompt).toContain("requiresSpecialist=false");
    expect(prompt).toContain(
      "não exija nem recomende revisão jurídica, técnica ou contábil da redação em message ou pending"
    );
    expect(prompt).toContain(
      "Completar fatos/validade ou mudar obrigações exige assessoria apropriada"
    );
  }
);
it.each(["write", "review"] as const)(
  "AC-7346: adaptador de ata %s conserva contrato e prompts já apresentados",
  async (phase) => {
    const run = vi.fn(async () => stdout({ value: "synthetic" }));
    const models = createLocalCodexAuthoringModels({
      confirmation: "synthetic-local-only",
      model: "synthetic-model",
      run
    });
    expect(
      await models.minutes.complete({ phase, operationId: "test", ...scope, data: input.data })
    ).toEqual({ value: "synthetic" });
    expect(models.minutes.key).toBe(models.document.key);
    if (phase === "write")
      expect((run.mock.calls[0] as unknown as [CodexProcessRequest])[0].input).toContain(
        "Não crie IDs só na cobertura"
      );
  }
);
it.each(["command_execution", "mcp_tool_call", "web_search", "file_change", "unknown"])(
  "AC-7346: evento %s é recusado sem retry",
  async (type) => {
    const run = vi.fn(
      async () =>
        `${JSON.stringify({ type: "item.completed", item: { type } })}\n${JSON.stringify({ type: "turn.completed" })}`
    );
    const model = createLocalCodexAuthoringModels({
      confirmation: "synthetic-local-only",
      run
    }).document;
    await expect(model.complete(input)).rejects.toMatchObject({ statusCode: 503 });
    expect(run).toHaveBeenCalledTimes(1);
  }
);
it.each([
  "",
  '{"type":"turn.failed"}',
  '{"type":"turn.completed"}',
  "not json",
  stdout({ value: 1 }) + "\n{}"
])("AC-7346: saída parcial/fora do protocolo é recusada", async (output) => {
  const run = vi.fn(async () => output);
  await expect(
    createLocalCodexAuthoringModels({
      confirmation: "synthetic-local-only",
      run
    }).document.complete(input)
  ).rejects.toMatchObject({ statusCode: 503 });
  expect(run).toHaveBeenCalledTimes(1);
});
it("AC-7346: limite de entrada/cancelamento anterior não inicia processo", async () => {
  const run = vi.fn();
  const models = createLocalCodexAuthoringModels({ confirmation: "synthetic-local-only", run });
  await expect(
    models.document.complete({ ...input, data: { text: "a".repeat(300001) } })
  ).rejects.toMatchObject({ statusCode: 422 });
  await expect(
    models.document.complete({ ...input, signal: AbortSignal.abort() })
  ).rejects.toThrow();
  expect(run).not.toHaveBeenCalled();
});
it("AC-7346: saída excessiva ou JSON inválido falha e limpa temporário", async () => {
  for (const output of ["a".repeat(65001), "not json"]) {
    let cwd = "";
    const run = vi.fn(async (r: CodexProcessRequest) => {
      cwd = r.cwd;
      return [
        { type: "item.completed", item: { type: "agent_message", text: output } },
        { type: "turn.completed" }
      ]
        .map((v) => JSON.stringify(v))
        .join("\n");
    });
    await expect(
      createLocalCodexAuthoringModels({
        confirmation: "synthetic-local-only",
        run
      }).document.complete(input)
    ).rejects.toMatchObject({ statusCode: 503 });
    await expect(access(cwd)).rejects.toThrow();
  }
});
it("AC-7346: falha/cancelamento durante o processo não usa fallback", async () => {
  const controller = new AbortController();
  const run = vi.fn(async () => {
    controller.abort();
    return stdout({ value: 1 });
  });
  await expect(
    createLocalCodexAuthoringModels({
      confirmation: "synthetic-local-only",
      run
    }).document.complete({ ...input, signal: controller.signal })
  ).rejects.toMatchObject({ statusCode: 503 });
  expect(run).toHaveBeenCalledTimes(1);
});
it.each([true, false])(
  "AC-7346: melhoria editorial conserva saída explícita offered=%s",
  async (offered) => {
    const model = createLocalCodexAuthoringModels({
      confirmation: "synthetic-local-only",
      run: async () =>
        stdout({
          offered,
          message: "Posso organizar os espaços?",
          text: "FICTÍCIO. Texto.",
          changes: "Espaços."
        })
    });
    expect(await model.improvement.suggest({ text: "FICTÍCIO.  Texto." } as DocumentDraft)).toEqual(
      offered
        ? { message: "Posso organizar os espaços?", text: "FICTÍCIO. Texto.", changes: "Espaços." }
        : null
    );
  }
);
it("AC-7346: melhoria inválida e opções sem confirmação não são aceitas", async () => {
  await expect(
    createLocalCodexAuthoringModels({
      confirmation: "synthetic-local-only",
      run: async () => stdout({ offered: true })
    }).improvement.suggest({} as DocumentDraft)
  ).rejects.toMatchObject({ statusCode: 422 });
  for (const options of [
    { confirmation: "production" },
    { timeoutMs: 0 },
    { timeoutMs: 300001 },
    { model: "unsafe\nmodel" }
  ])
    expect(() =>
      createLocalCodexAuthoringModels({
        confirmation: "synthetic-local-only",
        ...options
      } as Parameters<typeof createLocalCodexAuthoringModels>[0])
    ).toThrow();
});
function transcript() {
  return {
    params: { language: "pt", translate: false },
    result: { language: "pt" },
    transcription: [
      {
        offsets: { from: 0, to: 1000 },
        text: "Não houve votação.",
        tokens: [
          { text: "[_BEG_]", p: 0.1 },
          { text: "Não houve votação.", p: 0.9 }
        ]
      }
    ]
  };
}
it("AC-7346/47: tempos e negação preservados; token especial não identifica nem torna fala incerta", () => {
  expect(parseWhisperTranscript(transcript(), 1, 100)).toEqual([
    { startSeconds: 0, endSeconds: 1, text: "Não houve votação.", speaker: null, uncertain: false }
  ]);
  const value = transcript();
  value.transcription[0]!.tokens[1]!.p = 0.49;
  expect(parseWhisperTranscript(value, 1, 100)[0]!.uncertain).toBe(true);
});
it.each([
  "language",
  "translate",
  "empty",
  "time",
  "overlap",
  "probability",
  "token",
  "limit",
  "control",
  "specialOnly"
])("AC-7346: saída ASR %s é negada integralmente", (kind) => {
  const value = transcript();
  if (kind === "language") value.result.language = "en";
  if (kind === "translate") value.params.translate = true;
  if (kind === "empty") value.transcription = [];
  if (kind === "time") value.transcription[0]!.offsets.to = 2000;
  if (kind === "overlap") value.transcription.push(value.transcription[0]!);
  if (kind === "probability") value.transcription[0]!.tokens[1]!.p = NaN;
  if (kind === "token") value.transcription[0]!.tokens = [];
  if (kind === "control") value.transcription[0]!.text = "texto\u0000";
  if (kind === "specialOnly") value.transcription[0]!.tokens = [{ text: "[_BEG_]", p: 1 }];
  expect(() => parseWhisperTranscript(value, 1, kind === "limit" ? 1 : 100)).toThrow();
});
function wav() {
  const buffer = Buffer.alloc(32044);
  buffer.write("RIFF");
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(16000, 24);
  buffer.writeUInt32LE(32000, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(32000, 40);
  return buffer;
}
it("AC-7346/47: ASR local verifica hashes, executa sem corte e limpa bytes temporários", async () => {
  const directory = await mkdtemp(join(tmpdir(), "alvitra-whisper-test-"));
  try {
    const executable = join(directory, "synthetic.exe"),
      model = join(directory, "synthetic.bin");
    await writeFile(executable, "synthetic");
    await writeFile(model, "synthetic");
    const input = {
      condominiumId: scope.condominiumId,
      userId: scope.userId,
      chatId: scope.chatId,
      mode: "meeting" as const,
      content: wav(),
      durationSeconds: 1,
      maximumCharacters: 100
    };
    const run = vi.fn(async (r: WhisperProcess) => {
      expect(r.args).toEqual(expect.arrayContaining(["-l", "pt", "-ng", "-nf", "-ojf"]));
      expect(r.args).not.toContain("-d");
      expect(await readFile(r.args[r.args.indexOf("-f") + 1]!)).toEqual(input.content);
      await writeFile(`${r.args[r.args.indexOf("-of") + 1]}.json`, JSON.stringify(transcript()));
    });
    const options = {
      confirmation: "synthetic-local-only" as const,
      executable,
      executableSha256: hash("synthetic"),
      model,
      modelSha256: hash("synthetic"),
      run
    };
    const transcriber = createLocalWhisperTranscriber(options);
    expect(await transcriber.transcribe(input)).toMatchObject({
      processedDurationSeconds: 1,
      truncated: false,
      segments: [{ text: "Não houve votação.", speaker: null }]
    });
    await expect(access(run.mock.calls[0]![0].cwd)).rejects.toThrow();
    await writeFile(model, "changed");
    await expect(transcriber.transcribe(input)).rejects.toMatchObject({ statusCode: 503 });
    expect(run).toHaveBeenCalledTimes(1);
    await expect(transcriber.transcribe({ ...input, durationSeconds: 2 })).rejects.toMatchObject({
      statusCode: 422
    });
    const differentPcm = wav();
    differentPcm.writeUInt32LE(8000, 24);
    differentPcm.writeUInt32LE(8000, 28);
    differentPcm.writeUInt16LE(1, 32);
    differentPcm.writeUInt16LE(8, 34);
    const junk = Buffer.from(wav().subarray(12, 36));
    junk.write("JUNK", 0);
    const disguised = Buffer.concat([
      differentPcm.subarray(0, 12),
      junk,
      differentPcm.subarray(12)
    ]);
    disguised.writeUInt32LE(disguised.length - 8, 4);
    await expect(
      transcriber.transcribe({ ...input, content: disguised, durationSeconds: 4 })
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(run).toHaveBeenCalledTimes(1);
    await expect(
      transcriber.transcribe({ ...input, signal: AbortSignal.abort() })
    ).rejects.toThrow();
    await writeFile(model, "synthetic");
    const failure = createLocalWhisperTranscriber({
      ...options,
      run: async () => {
        throw new Error("native-sensitive-error");
      }
    });
    await expect(failure.transcribe(input)).rejects.toThrow("Nenhum fallback");
    expect(() => createLocalWhisperTranscriber({ ...options, timeoutMs: 0 })).toThrow();
    expect(() => createLocalWhisperTranscriber({ ...options, model: "relative" })).toThrow();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
it("AC-7348: purga conserva falas públicas e oculta recibos internos sem texto derivado", async () => {
  const store = createInMemoryConversationStore();
  const messages = [
    {
      id: randomUUID(),
      role: "user" as const,
      kind: "question_answer" as const,
      text: "Pode preparar o aviso?"
    },
    {
      id: randomUUID(),
      role: "assistant" as const,
      kind: "question_answer" as const,
      text: "Preparei a proposta para sua revisão."
    }
  ];
  const entry = await store.append(scope, {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    requestKey: "test",
    inputHash: hash("synthetic"),
    messages,
    response: { draft: { text: "PRIVATE-DERIVATIVE" } },
    metadata: { documentDraftId: "synthetic", secretContent: "PRIVATE-METADATA" }
  });
  const purged = scrubAuthoringEntry(entry);
  expect(purged.messages).toEqual(messages);
  expect(purged.inputHash).toBe(entry.inputHash);
  expect(purged.response).toEqual({ status: "purged" });
  expect(JSON.stringify(purged)).not.toContain("PRIVATE");
  const internal = scrubAuthoringEntry({
    ...entry,
    metadata: { ...entry.metadata, internalAuthoring: true },
    messages: [{ ...messages[0]!, text: "PRIVATE-INTERNAL" }]
  });
  expect(internal.metadata.internalAuthoring).toBe(true);
  expect(internal.messages[0]!.id).toBe(messages[0]!.id);
  expect(JSON.stringify(internal)).not.toContain("PRIVATE");
  expect(scrubAuthoringEntry(internal)).toEqual(internal);
});
