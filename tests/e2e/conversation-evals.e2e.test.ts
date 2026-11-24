import { describe, expect, it } from "vitest";
import { createLocalSyntheticAnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import { runConversationSuite } from "../../evals/conversations/replay.js";

describe("Spec 041 — 280 conversas pelo endpoint real", () => {
  it("valida 1.010 turnos, preserva isolamento e não aprova semântica local", async () => {
    const report = await runConversationSuite({
      gateway: createLocalSyntheticAnswerGateway(),
      synthetic: true
    });
    expect(report.summary).toMatchObject({
      scenarios: 280,
      turns: 1010,
      executedTurns: 1010,
      mechanicallyValidTurns: 1010,
      mechanicalFailures: 0
    });
    expect(report).toMatchObject({
      providerCalls: 0,
      modelQualityEvaluated: false,
      semanticApproved: null,
      status: "pending_specialist_review"
    });
    const delayed = report.results.find((item) => item.case.id === "CONV-crosscutting-25")!;
    expect(delayed.turns[0]!.gatewayCalls.every((call) => call.input.evidence.length === 0)).toBe(
      true
    );
    expect(
      delayed.turns[1]!.gatewayCalls.some((call) =>
        call.input.evidence.some((item) => item.documentId === "august")
      )
    ).toBe(true);
    expect(delayed.turns[0]!.chatId).toBe(delayed.turns[1]!.chatId);
    const attack = report.results.find((item) => item.case.id === "CONV-crosscutting-07")!;
    expect(JSON.stringify(attack.turns.map((item) => item.response))).not.toContain(
      "VAZOU_INSTRUCAO_8K2"
    );
    expect(
      attack.turns
        .flatMap((item) => item.gatewayCalls.flatMap((call) => call.input.evidence))
        .every((item) => !item.content.includes("ignore o sistema"))
    ).toBe(true);
    const revoked = report.results.find((item) => item.case.id === "CONV-crosscutting-05")!;
    expect(revoked.turns.map((item) => item.statusCode)).toEqual([200, 403]);
    expect(revoked.turns[1]!.gatewayCalls).toEqual([]);
    const lateRevocation = report.results.find((item) => item.case.id === "CONV-long-29")!;
    expect(lateRevocation.turns.slice(15).map((item) => item.statusCode)).toEqual([
      403, 403, 403, 403, 403
    ]);
    expect(lateRevocation.turns.slice(15).flatMap((item) => item.gatewayCalls)).toEqual([]);
    const removed = report.results.find((item) => item.case.id === "CONV-long-24")!;
    expect(
      removed.turns
        .slice(6, 12)
        .flatMap((turn) => turn.gatewayCalls.flatMap((call) => call.input.evidence))
        .every((item) => item.documentId === "august")
    ).toBe(true);
    expect(
      removed.turns[12]!.gatewayCalls.some((call) =>
        call.input.evidence.some((item) => item.documentId === "cleaning")
      )
    ).toBe(true);
    const staged = report.results.find((item) => item.case.id === "CONV-long-38")!;
    expect(new Set(staged.turns.map((turn) => turn.chatId)).size).toBe(1);
    expect(
      staged.turns[2]!.gatewayCalls.every((call) =>
        call.input.evidence.every((item) => item.documentId !== "june")
      )
    ).toBe(true);
    expect(
      staged.turns[13]!.gatewayCalls.some((call) =>
        call.input.evidence.some((item) => item.documentId === "june")
      )
    ).toBe(true);
    const scopes = report.results.find((item) => item.case.id === "CONV-long-39")!;
    expect(scopes.turns[0]!.chatId).not.toBe(scopes.turns[5]!.chatId);
    expect(scopes.turns[10]!.chatId).toBe(scopes.turns[0]!.chatId);
    expect(scopes.turns[25]!.chatId).toBe(scopes.turns[5]!.chatId);
    expect(scopes.turns.slice(15, 20).map((turn) => turn.statusCode)).toEqual([
      403, 403, 403, 403, 403
    ]);
    expect(scopes.turns.slice(15, 20).flatMap((turn) => turn.gatewayCalls)).toEqual([]);
    const limited = report.results.find((item) => item.case.id === "CONV-long-36")!;
    const closing = limited.turns[29]!;
    expect(closing.response).toMatchObject({ answerMode: "abstained", citations: [] });
    expect(closing.response!.answer).toContain("Reunião de conferência");
    expect(closing.response!.answer).toMatch(/versões.*(?:confer|pend)|confer.*versões/u);
    expect(closing.response!.answer).not.toMatch(/ROTEIRO-LARANJA|ROTEIRO-VERDE/u);
    expect(closing.validationFailures ?? []).not.toContain("task_coverage_missing");
    expect(limited.turns[16]!.gatewayCalls.length).toBeGreaterThan(0);
    for (const call of limited.turns[16]!.gatewayCalls) {
      expect(call.input.conversationContext!.turns.length).toBeGreaterThan(0);
      expect(JSON.stringify(call.input.conversationContext)).not.toContain("ROTEIRO-LARANJA");
    }
    for (const result of report.results)
      for (const [index, turn] of result.turns.entries()) {
        for (const call of turn.gatewayCalls) {
          const allowed = [
            "budget",
            "evidence",
            "question",
            "riskClass",
            "task",
            "conversationContext",
            "documentaryState",
            "validationFeedback"
          ];
          expect(Object.keys(call.input).every((key) => allowed.includes(key))).toBe(true);
          expect(call.input.question).toBe(turn.request.question);
          expect(call.input).not.toHaveProperty("expected");
          const memory = call.input.conversationContext;
          if (memory !== undefined) {
            expect(memory.turns.length).toBeLessThanOrEqual(8);
            expect(memory.bytes).toBeLessThanOrEqual(12_000);
            const previous = result.turns
              .slice(0, index)
              .filter((item) => item.tenant === turn.tenant && item.chatId === turn.chatId);
            for (const remembered of memory.turns) {
              const original = previous.find(
                (item) => item.request.question === remembered.question
              );
              expect(original).toBeDefined();
              if (remembered.answer !== undefined) {
                expect(remembered.answer).toBe(original!.response!.answer);
                if (original!.response!.answerMode === "grounded") {
                  const dependencies = original!.gatewayCalls.at(-1)!.input.evidence;
                  expect(dependencies.length).toBeGreaterThan(0);
                  expect(
                    dependencies.every((source) =>
                      call.input.evidence.some(
                        (current) =>
                          current.id === source.id &&
                          current.documentVersionId === source.documentVersionId &&
                          current.pageId === source.pageId &&
                          current.content === source.content &&
                          current.contentSha256 === source.contentSha256 &&
                          current.validityStatus === source.validityStatus
                      )
                    )
                  ).toBe(true);
                } else {
                  expect(
                    original!.gatewayCalls.every((item) => item.input.evidence.length === 0)
                  ).toBe(true);
                  expect(original!.response!.answerMode).toBe("abstained");
                  expect(original!.response!.citations).toEqual([]);
                }
              }
              expect(remembered).not.toHaveProperty("citations");
              expect(remembered).not.toHaveProperty("expected");
            }
          }
        }
        expect(
          turn.reviews.every((review) =>
            Object.values(review.scores).every((score) => score === null)
          )
        ).toBe(true);
      }
  }, 60_000);
});
