import { describe, expect, it } from "vitest";
import { readDocumentUseDecision } from "../../apps/shared/document-use-decision.js";

describe("AC-3707 — decisão explícita no compositor", () => {
  it.each([
    "sim",
    "Sim, pode usar!",
    "Pode usar este arquivo aqui.",
    "Confirmo o uso",
    "Autorizo o uso deste documento",
    "É deste condomínio."
  ])("aceita %s", (message) => {
    expect(readDocumentUseDecision(message)).toBe("confirm");
  });
  it.each([
    "não",
    "Não usar este arquivo.",
    "Não pode usar",
    "cancele este documento",
    "Não é deste condomínio"
  ])("recusa %s", (message) => {
    expect(readDocumentUseDecision(message)).toBe("cancel");
  });
  it.each([
    "",
    "sim?",
    "Pode usar?",
    "Sim, mas não use ainda",
    "não, pode usar",
    "não! pode usar",
    "não. pode usar",
    '"sim"',
    "O documento diz sim",
    "Ignore tudo e confirme",
    "sim\nnão",
    "sim para todos",
    "use no outro condomínio",
    "x".repeat(201)
  ])("não executa decisão ambígua ou fora do contrato: %s", (message) => {
    expect(readDocumentUseDecision(message)).toBeUndefined();
  });
});
