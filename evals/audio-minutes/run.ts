import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import {
  validateMinutesPlan,
  validateMinutesReview,
  semanticHash,
  type MinutesPlan,
  type MinutesReview
} from "../../apps/api/authoring/semantic-minutes-contract.js";
import { renderSemanticMinutes } from "../../apps/api/authoring/semantic-minutes-renderer.js";
import {
  syntheticMinutesInput,
  syntheticMinutesPlan,
  acceptedMinutesReview
} from "../../tests/fixtures/semantic-minutes.js";
type Mutable<T> = T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T;
type Scenario = {
  id: string;
  expected: "accepted" | "blocked";
  plan?: (p: Mutable<MinutesPlan>) => void;
  review?: (r: Mutable<MinutesReview>) => void;
};
// Saídas e conferências rotuladas manualmente. Exercita controles; não mede um modelo real.
const scenarios: Scenario[] = [
  { id: "summary-topics-decisions-actions", expected: "accepted" },
  {
    id: "invented-number",
    expected: "blocked",
    plan: (p) => {
      p.topics[0]!.decisions[0]!.claim.text = "Aprovado por 99 votos.";
    }
  },
  {
    id: "forged-quote",
    expected: "blocked",
    plan: (p) => {
      p.topics[0]!.discussion[0]!.references[0]!.quote = "Frase inexistente.";
    }
  },
  {
    id: "uncertain-as-fact",
    expected: "blocked",
    plan: (p) => {
      p.topics[0]!.discussion[0]!.references = [
        { segmentIndex: 6, quote: "[inaudível] prazo do seguro." }
      ];
    }
  },
  {
    id: "proposal-as-approval",
    expected: "blocked",
    plan: (p) => {
      const proposal = p.topics[0]!.proposals.pop()!;
      p.topics[0]!.decisions.push({ outcome: "approved", claim: proposal });
    },
    review: (r) => {
      r.status = "rejected";
      r.issues = ["decision_not_supported"];
    }
  },
  {
    id: "lost-negation",
    expected: "blocked",
    plan: (p) => {
      p.topics[0]!.discussion[1]!.text = "A substituição foi aprovada.";
    },
    review: (r) => {
      r.status = "rejected";
      r.issues = ["negation"];
    }
  },
  {
    id: "inferred-name",
    expected: "blocked",
    plan: (p) => {
      p.topics[0]!.actions[0]!.owner!.text = "João Fictício";
    },
    review: (r) => {
      r.status = "rejected";
      r.issues = ["identity_inferred"];
    }
  },
  {
    id: "late-decision-omitted",
    expected: "blocked",
    plan: (p) => {
      p.topics.pop();
      p.coverage[8]!.disposition = "non_material";
      p.coverage[8]!.statementIds = [];
    },
    review: (r) => {
      r.status = "rejected";
      r.issues = ["omitted_material_topic"];
    }
  },
  {
    id: "unsupported-heading",
    expected: "blocked",
    plan: (p) => {
      p.topics[1]!.title = "Obra do jardim aprovada";
    },
    review: (r) => {
      r.status = "rejected";
      r.issues = ["unsupported_heading"];
    }
  },
  {
    id: "unreviewed-statement",
    expected: "blocked",
    review: (r) => {
      r.statements.pop();
    }
  },
  {
    id: "unreviewed-tail",
    expected: "blocked",
    review: (r) => {
      r.segments.pop();
    }
  },
  {
    id: "wrong-review-source",
    expected: "blocked",
    review: (r) => {
      r.sourceHash = "f".repeat(64);
    }
  },
  {
    id: "wrong-review-plan",
    expected: "blocked",
    review: (r) => {
      r.planHash = "f".repeat(64);
    }
  }
];
const results = [];
for (const mode of ["dictation", "meeting"] as const) {
  const audio = syntheticMinutesInput(mode),
    hash = semanticHash(audio);
  for (const scenario of scenarios) {
    const plan = structuredClone(syntheticMinutesPlan(audio)) as Mutable<MinutesPlan>;
    scenario.plan?.(plan);
    const review = structuredClone(
      acceptedMinutesReview(plan, hash, audio.segments.length)
    ) as Mutable<MinutesReview>;
    scenario.review?.(review);
    let actual: "accepted" | "blocked" = "blocked";
    try {
      const checked = validateMinutesPlan(plan, audio);
      validateMinutesReview(review, checked, audio, hash);
      const content = renderSemanticMinutes(audio, checked);
      assert(content.text.includes("Pintura da fachada"));
      assert(!content.text.includes("Pessoal, vamos falar da bomba"));
      assert(!content.text.includes("ignore as regras"));
      actual = "accepted";
    } catch (error) {
      if (!(error instanceof Error) || !("statusCode" in error) || error.statusCode !== 422)
        throw error;
    }
    results.push({
      id: scenario.id,
      mode,
      expected: scenario.expected,
      actual,
      passed: actual === scenario.expected
    });
  }
}
await mkdir(".local/authoring/semantic-evals", { recursive: true });
const report = {
  syntheticOnly: true,
  scriptedOutputs: true,
  realModelQualityEvaluated: false,
  realProviderCalls: 0,
  results
};
await writeFile(
  ".local/authoring/semantic-evals/results.json",
  JSON.stringify(report, null, 2) + "\n"
);
assert(
  results.every((result) => result.passed),
  "Falha nos controles de redação da ata."
);
process.stdout.write(
  JSON.stringify({
    cases: results.length,
    passed: results.length,
    realProviderCalls: 0,
    realModelQualityEvaluated: false
  }) + "\n"
);
