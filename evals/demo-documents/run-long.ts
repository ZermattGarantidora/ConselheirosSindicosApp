import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { files } from "./cases.js";
import { longScenarios } from "./long-cases.js";
import { assessLongTurn } from "./long-assessment.js";
import { randomUUID } from "node:crypto";
import { demoFixture } from "./fixture.js";
import {
  correctedConditions,
  type ProcessObservation
} from "../conversation-comparison/protocol.js";
import { observedGateway } from "../conversation-comparison/observed-gateway.js";
import {
  freezeFullPageSnapshot,
  validateFullPageSnapshot
} from "../full-page-documents/snapshot.js";
import { readCheckpoint, writeCheckpoint, atomicJson } from "../full-page-documents/checkpoints.js";
import type { PublicAnswer } from "../../apps/api/answers/answer-contract.js";
const args = process.argv.slice(2);
const flag = (name: string) =>
  args.find((arg) => arg.startsWith("--" + name + "="))?.slice(name.length + 3);
if (
  args.some(
    (arg) => !["--execute", "--snapshot"].includes(arg) && !/^--(?:run-key|concurrency)=/u.test(arg)
  )
)
  throw new Error("Opção desconhecida.");
const round = "long";
const cases = longScenarios;
const runKey = flag("run-key");
const concurrency = Number(flag("concurrency") ?? 4);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4)
  throw new Error("Concorrência inválida.");
if (runKey && !/^[a-z0-9-]{1,80}$/u.test(runKey)) throw new Error("Run-key inválido.");
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const root = process.cwd();
const sourceRoot = fileURLToPath(new URL("../../", import.meta.url));
async function extras(source: string) {
  const paths = (await readdir(join(source, "evals/demo-documents")))
    .filter((name) => name.endsWith(".ts"))
    .map((name) => "evals/demo-documents/" + name);
  paths.push(...Object.values(files).map((name) => "tests/fixtures/demo-documents/" + name));
  return Promise.all(
    paths.sort().map(async (path) => ({
      path,
      hash: createHash("sha256")
        .update(await readFile(join(source, path)))
        .digest("hex")
    }))
  );
}
const plan = {
  suite: "demo-documents-long-v1",
  round,
  conditions: correctedConditions,
  conversationsPerModel: cases.length,
  turnsPerConversation: 30,
  responses: cases.reduce((sum, item) => sum + item.turns.length, 0) * 2,
  concurrency,
  datasetHash: digest(cases),
  corpus: (await extras(sourceRoot)).filter((item) => item.path.endsWith(".pdf"))
};
if (!args.includes("--execute")) {
  console.log(JSON.stringify({ ...plan, providerCalls: 0, execution: "plan_only" }, null, 2));
  process.exit(0);
}
if (!runKey) throw new Error("Execução exige run-key.");
if (process.env.CODEX_ANSWER_ENABLED !== "true" || process.env.DEMO_MODE !== "true")
  throw new Error("Somente Codex local de demonstração autorizado.");
const directory = resolve(root, ".local/demo-document-evals", runKey);
await mkdir(directory, { recursive: true });
if (!args.includes("--snapshot")) {
  const snapshot = await freezeFullPageSnapshot(root, directory);
  const before = await extras(root);
  const extraManifest = join(directory, "demo-snapshot.json");
  const old = await readCheckpoint<typeof before>(extraManifest);
  if (old && digest(old) !== digest(await extras(snapshot)))
    throw new Error("Snapshot extra adulterado.");
  if (!old) {
    for (const item of before) {
      const target = join(snapshot, item.path);
      await mkdir(resolve(target, ".."), { recursive: true });
      await copyFile(join(root, item.path), target);
    }
    if (digest(before) !== digest(await extras(snapshot)))
      throw new Error("Corpus mudou na cópia.");
    await writeCheckpoint(extraManifest, before);
  }
  const code = await new Promise<number>((done, reject) => {
    const child = spawn(
      process.execPath,
      [
        resolve(root, "scripts/run-tsx.mjs"),
        join(snapshot, "evals/demo-documents/run-long.ts"),
        ...args,
        "--snapshot"
      ],
      { cwd: root, windowsHide: true, stdio: "inherit" }
    );
    child.on("error", reject);
    child.on("exit", (code) => done(code ?? 1));
  });
  process.exit(code);
}
if (resolve(sourceRoot) !== resolve(directory, "snapshot"))
  throw new Error("Snapshot obrigatório.");
const sourceFingerprint = await validateFullPageSnapshot(sourceRoot, directory);
const frozen = await readCheckpoint<Awaited<ReturnType<typeof extras>>>(
  join(directory, "demo-snapshot.json")
);
if (!frozen || digest(frozen) !== digest(await extras(sourceRoot)))
  throw new Error("Corpus ou harness alterado.");
const manifest = { ...plan, sourceFingerprint, extraFingerprint: digest(frozen) };
const manifestHash = digest(manifest);
const previous = await readCheckpoint<typeof manifest>(join(directory, "manifest.json"));
if (previous && digest(previous) !== manifestHash) throw new Error("Retomada incompatível.");
if (!previous) await writeCheckpoint(join(directory, "manifest.json"), manifest);

type TurnPoint = {
  turn: number;
  question: string;
  kind: string;
  tag: string;
  status: number;
  body: Partial<PublicAnswer>;
  assessment: ReturnType<typeof assessLongTurn>;
  inputs: unknown[];
  outputs: unknown[];
  diagnostics: unknown[];
  observations: ProcessObservation[];
};
type ConversationPoint = {
  manifestHash: string;
  scenario: string;
  model: string;
  chatId: string;
  turns: TurnPoint[];
  historyChecks: unknown[];
  isolationCheck: unknown;
};
const jobs: {
  scenario: (typeof cases)[number];
  condition: (typeof correctedConditions)[number];
  key: string;
}[] = [];
const conversations: ConversationPoint[] = [];
const progress = new Map<string, ConversationPoint>();
for (const [index, scenario] of cases.entries())
  for (const condition of index % 2 === 0
    ? correctedConditions
    : [...correctedConditions].reverse()) {
    const key = condition.id + "-long-" + scenario.id;
    const saved = await readCheckpoint<ConversationPoint>(join(directory, key + ".json"));
    if (saved) {
      if (saved.manifestHash !== manifestHash) throw new Error("Conversa concluída incompatível.");
      conversations.push(saved);
      progress.set(key, saved);
      continue;
    }
    const partial = await readCheckpoint(join(directory, key + "-turn-01.json"));
    if (partial)
      throw new Error(
        "Conversa parcial preservada. Não repetir inferências ou recomeçar silenciosamente."
      );
    jobs.push({ scenario, condition, key });
  }
let summaryQueue = Promise.resolve();
function summarize() {
  const points = [...progress.values()].map((conversation) => structuredClone(conversation));
  summaryQueue = summaryQueue.then(() =>
    atomicJson(join(directory, "summary.json"), {
      manifest,
      completedConversations: conversations.length,
      expectedConversations: cases.length * 2,
      completedTurns: points.reduce((sum, item) => sum + item.turns.length, 0),
      expectedTurns: plan.responses,
      models: correctedConditions.map((condition) => {
        const selected = points.filter((item) => item.model === condition.model);
        const turns = selected.flatMap((item) => item.turns);
        const observations = turns.flatMap((turn) => turn.observations);
        return {
          model: condition.model,
          conversations: selected.map((item) => ({
            scenario: item.scenario,
            turns: item.turns.length,
            final: item.turns.at(-1)?.assessment.outcome
          })),
          completedTurns: turns.length,
          automaticComplete: turns.filter(
            (turn) => turn.assessment.outcome === "automatic_complete"
          ).length,
          limitedContext: turns.filter((turn) => turn.assessment.outcome === "limited_context")
            .length,
          alerts: turns
            .filter((turn) => turn.assessment.outcome === "needs_review")
            .map((turn) => ({
              turn: turn.turn,
              tag: turn.tag,
              question: turn.question,
              missing: turn.assessment.missing,
              mechanical: turn.assessment.mechanical
            })),
          attempts: observations.length,
          tokens: observations.reduce(
            (sum, item) => ({
              input: sum.input + (item.usage?.input ?? 0),
              output: sum.output + (item.usage?.output ?? 0),
              cached: sum.cached + (item.usage?.cached ?? 0)
            }),
            { input: 0, output: 0, cached: 0 }
          )
        };
      })
    })
  );
  return summaryQueue;
}
let cursor = 0;
await summarize();
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++]!;
      const observations: ProcessObservation[] = [];
      const fixture = await demoFixture(
        sourceRoot,
        observedGateway(job.condition, observations, {
          executable: process.env.CODEX_CLI_PATH ?? "codex",
          timeoutMs: 300000
        })
      );
      const chatId = randomUUID();
      const conversation: ConversationPoint = {
        manifestHash,
        scenario: job.scenario.id,
        model: job.condition.model,
        chatId,
        turns: [],
        historyChecks: [],
        isolationCheck: null
      };
      progress.set(job.key, conversation);
      const route = "/v1/condominiums/demo-docs";
      const createChat = async (id: string) => {
        const response = await fixture.app.inject({
          method: "POST",
          url: route + "/chats",
          headers: fixture.headers,
          payload: { id, title: "Conversa longa sintética" }
        });
        if (response.statusCode !== 201) throw new Error("Chat não criado.");
      };
      try {
        await createChat(chatId);
        for (const [index, turn] of job.scenario.turns.entries()) {
          fixture.inputs.length = 0;
          fixture.outputs.length = 0;
          fixture.diagnostics.length = 0;
          observations.length = 0;
          const response = await fixture.app.inject({
            method: "POST",
            url: route + "/questions",
            headers: fixture.headers,
            payload: { question: turn.question, chatId }
          });
          const body = response.json<Partial<PublicAnswer>>();
          const point: TurnPoint = structuredClone({
            turn: index + 1,
            question: turn.question,
            kind: turn.kind,
            tag: turn.tag,
            status: response.statusCode,
            body,
            assessment: assessLongTurn(turn, body, fixture.inputs, fixture.diagnostics),
            inputs: fixture.inputs,
            outputs: fixture.outputs,
            diagnostics: fixture.diagnostics,
            observations
          });
          await writeCheckpoint(
            join(directory, job.key + "-turn-" + String(index + 1).padStart(2, "0") + ".json"),
            { manifestHash, ...point }
          );
          conversation.turns.push(point);
          if ((index + 1) % 10 === 0) {
            const history = await fixture.app.inject({
              url: route + "/chats/" + chatId + "/messages",
              headers: fixture.headers
            });
            const entries = history.json<{
              entries: { messages: { role: string; text: string; kind: string }[] }[];
            }>();
            const messages = entries.entries
              .flatMap((entry) => entry.messages)
              .filter((message) => message.kind === "question_answer");
            const expected = conversation.turns
              .filter((turn) => turn.status === 200 && turn.body.answer)
              .flatMap((turn) => [
                { role: "user", text: turn.question },
                { role: "assistant", text: turn.body.answer! }
              ]);
            conversation.historyChecks.push({
              turn: index + 1,
              status: history.statusCode,
              messages: messages.length,
              expected: expected.length,
              exact:
                JSON.stringify(messages.map(({ role, text }) => ({ role, text }))) ===
                JSON.stringify(expected)
            });
          }
          await summarize();
          console.log(
            JSON.stringify({
              model: job.condition.model,
              scenario: job.scenario.id,
              turn: index + 1,
              totalTurns: job.scenario.turns.length,
              outcome: point.assessment.outcome,
              missing: point.assessment.missing,
              mechanical: point.assessment.mechanical,
              memory: point.assessment.memories.at(-1)
            })
          );
        }
        const emptyId = randomUUID();
        await createChat(emptyId);
        const empty = (
          await fixture.app.inject({
            url: route + "/chats/" + emptyId + "/messages",
            headers: fixture.headers
          })
        ).json<{ entries: unknown[] }>();
        const denied = await fixture.app.inject({
          url: route + "/chats/" + chatId + "/messages",
          headers: { "x-development-user-id": "morador-alameda-demo" }
        });
        conversation.isolationCheck = {
          newChatEmpty: empty.entries.length === 0,
          otherUserStatus: denied.statusCode
        };
        await writeCheckpoint(join(directory, job.key + ".json"), conversation);
        conversations.push(conversation);
        await summarize();
      } finally {
        await fixture.app.close();
      }
    }
  })
);
await summaryQueue;
console.log(
  JSON.stringify({
    completedConversations: conversations.length,
    completedTurns: conversations.reduce((sum, item) => sum + item.turns.length, 0),
    directory
  })
);
