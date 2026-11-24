import { tenTurnCases } from "./long-10.js";
import { fifteenTurnCases } from "./long-15.js";
import { twentyTurnCases } from "./long-20.js";
import { thirtyTurnCases } from "./long-30.js";

export const longConversationCases = Object.freeze([
  ...tenTurnCases,
  ...fifteenTurnCases,
  ...twentyTurnCases,
  ...thirtyTurnCases
]);
