import { baselineConversationCases, longConversationCases } from "../conversations/dataset.js";

// Amostra fixada antes da matriz completa: todos os finais longos, continuações curtas e 21 desafios intermediários.
export const auditTargets = Object.freeze([
  ...longConversationCases.map((item) => ({ caseId: item.id, turn: item.turns.length })),
  ...baselineConversationCases
    .filter((item) => item.turns.length > 1)
    .map((item) => ({ caseId: item.id, turn: item.turns.length })),
  ...(
    [
      ["01", 3],
      ["01", 9],
      ["05", 7],
      ["06", 4],
      ["07", 6],
      ["09", 6],
      ["09", 9],
      ["18", 5],
      ["18", 9],
      ["19", 4],
      ["19", 8],
      ["21", 13],
      ["22", 17],
      ["24", 8],
      ["24", 13],
      ["25", 5],
      ["26", 10],
      ["29", 16],
      ["31", 21],
      ["36", 17],
      ["39", 8]
    ] as const
  ).map(([id, turn]) => ({ caseId: `CONV-long-${id}`, turn }))
]);
