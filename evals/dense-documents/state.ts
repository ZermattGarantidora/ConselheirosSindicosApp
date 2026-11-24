import { createHash } from "node:crypto";
import type { DenseCase } from "./oracle.js";

const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function validateDenseCaseCheckpoint(
  value: { manifestHash: string; result: { testCase: DenseCase } },
  manifestHash: string,
  testCase: DenseCase
) {
  if (value.manifestHash !== manifestHash || digest(value.result.testCase) !== digest(testCase))
    throw new Error("Checkpoint de outra rodada ou de outro caso.");
}
export function validateDensePreparedCheckpoint(
  value: { manifestHash: string },
  manifestHash: string
) {
  if (value.manifestHash !== manifestHash)
    throw new Error("Corpus preparado pertence a outra rodada.");
}
