import { expect, it } from "vitest";
import {
  validateMinutesPlan,
  validateMinutesReview,
  semanticHash,
  type MinutesPlan,
  type MinutesReview
} from "../../apps/api/authoring/semantic-minutes-contract.js";
import {
  syntheticMinutesInput,
  syntheticMinutesPlan,
  acceptedMinutesReview
} from "../fixtures/semantic-minutes.js";
type Mutable<T> = T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T;
const audio = syntheticMinutesInput();
const plan = () => structuredClone(syntheticMinutesPlan(audio)) as Mutable<MinutesPlan>;
it("AC-7317/18: plano e conferência completos passam sem depender da ordem das propriedades JSON", () => {
  const p = plan(),
    sourceHash = semanticHash(audio),
    r = acceptedMinutesReview(p, sourceHash, audio.segments.length);
  expect(validateMinutesPlan(p, audio)).toEqual(p);
  expect(validateMinutesReview(r, p, audio, sourceHash)).toEqual(r);
  expect(semanticHash({ b: 2, a: 1 })).toBe(semanticHash({ a: 1, b: 2 }));
});
const badPlans: readonly [string, (p: Mutable<MinutesPlan>) => void][] = [
  [
    "invented_number",
    (p) => {
      p.topics[0]!.discussion[0]!.text = "Foram aprovados 99 votos.";
    }
  ],
  [
    "unsupported_reference",
    (p) => {
      p.topics[0]!.discussion[0]!.references[0]!.quote = "Frase que nunca foi dita.";
    }
  ],
  [
    "unsupported_reference",
    (p) => {
      p.topics[0]!.discussion[0]!.references[0]!.segmentIndex = 6;
    }
  ],
  [
    "unsupported_reference",
    (p) => {
      p.topics[0]!.discussion[0]!.references[0]!.segmentIndex = 1999;
    }
  ],
  [
    "duplicate_or_invalid_claim",
    (p) => {
      p.topics[0]!.discussion[1]!.id = p.topics[0]!.discussion[0]!.id;
    }
  ],
  [
    "duplicate_or_invalid_claim",
    (p) => {
      p.topics[0]!.discussion[0]!.text = "Texto\u0001 oculto";
    }
  ],
  [
    "duplicate_field",
    (p) => {
      p.meeting.push(p.meeting[0]!);
    }
  ],
  [
    "invalid_coverage",
    (p) => {
      p.coverage.push(p.coverage[0]!);
    }
  ],
  [
    "invalid_coverage",
    (p) => {
      p.coverage[0]!.statementIds.push("condo");
    }
  ],
  [
    "coverage_claim_mismatch",
    (p) => {
      p.coverage[0]!.statementIds = ["problem"];
    }
  ],
  [
    "coverage_claim_mismatch",
    (p) => {
      p.coverage[7]!.statementIds = ["problem"];
    }
  ],
  [
    "uncertain_as_fact",
    (p) => {
      p.coverage[6]!.disposition = "non_material";
    }
  ],
  [
    "incomplete_coverage",
    (p) => {
      p.coverage.pop();
    }
  ],
  [
    "reference_not_covered",
    (p) => {
      p.coverage[0]!.disposition = "non_material";
      p.coverage[0]!.statementIds = [];
    }
  ],
  [
    "invalid_pending_reference",
    (p) => {
      p.unresolved[0]!.segmentIndexes = [999];
    }
  ],
  [
    "invalid_pending_reference",
    (p) => {
      p.unresolved[0]!.segmentIndexes = [6, 6];
    }
  ],
  [
    "uncertain_not_pending",
    (p) => {
      p.unresolved.shift();
    }
  ],
  [
    "claim_count",
    (p) => {
      p.meeting = [];
      p.topics = [{ title: "Vazio", discussion: [], proposals: [], decisions: [], actions: [] }];
    }
  ]
];
it.each(badPlans)("AC-7318: bloqueia plano inválido (%s)", (code, mutate) => {
  const p = plan();
  mutate(p);
  expect(() => validateMinutesPlan(p, audio)).toThrow(code);
});
it.each([null, {}, { version: "wrong" }, "x".repeat(61_000)])(
  "AC-7318: saída fora do schema/limite não passa",
  (raw) => {
    expect(() => validateMinutesPlan(raw, audio)).toThrow("invalid_plan");
  }
);
const badReviews: readonly [string, (r: Mutable<MinutesReview>) => void][] = [
  [
    "review_rejected",
    (r) => {
      r.status = "rejected";
    }
  ],
  [
    "review_rejected",
    (r) => {
      r.issues = ["negation"];
    }
  ],
  [
    "review_rejected",
    (r) => {
      r.sourceHash = "b".repeat(64);
    }
  ],
  [
    "review_rejected",
    (r) => {
      r.planHash = "b".repeat(64);
    }
  ],
  [
    "statement_rejected",
    (r) => {
      r.statements[0]!.supported = false;
    }
  ],
  [
    "statement_rejected",
    (r) => {
      r.statements.push(r.statements[0]!);
    }
  ],
  [
    "statement_rejected",
    (r) => {
      r.statements[0]!.kind = "decision_approved";
    }
  ],
  [
    "segment_rejected",
    (r) => {
      r.segments[0]!.adequate = false;
    }
  ],
  [
    "segment_rejected",
    (r) => {
      r.segments.push(r.segments[0]!);
    }
  ],
  [
    "segment_rejected",
    (r) => {
      r.segments[0]!.segmentIndex = 1999;
    }
  ],
  [
    "incomplete_review",
    (r) => {
      r.statements.pop();
    }
  ],
  [
    "incomplete_review",
    (r) => {
      r.segments.pop();
    }
  ]
];
it.each(badReviews)(
  "AC-7318/19: não libera conferência parcial/divergente (%s)",
  (code, mutate) => {
    const p = plan(),
      hash = semanticHash(audio),
      r = structuredClone(
        acceptedMinutesReview(p, hash, audio.segments.length)
      ) as Mutable<MinutesReview>;
    mutate(r);
    expect(() => validateMinutesReview(r, p, audio, hash)).toThrow(code);
  }
);
it("AC-7318: rejeita schema de conferência inválido", () => {
  expect(() => validateMinutesReview({}, plan(), audio, semanticHash(audio))).toThrow(
    "invalid_review"
  );
});
