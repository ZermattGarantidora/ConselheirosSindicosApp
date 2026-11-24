import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { homologationCases, corpusVersion, reviewChecks } from "./corpus.js";
import { assessReviews, packetHash, preparePacket, verifyPreparedInputs } from "./protocol.js";
import { validateOperationalProposal } from "./operations.js";
import { rehearseOperations } from "./rehearsal.js";
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--verify-inputs") {
  verifyPreparedInputs(
    JSON.parse(await readFile(resolve(".local/authoring-homologation/inputs.json"), "utf8")),
    homologationCases
  );
  process.stdout.write("Entradas sintéticas conferidas contra o corpus.\n");
  process.exit(0);
}
if (args.length)
  throw new Error(
    "Este comando prepara somente o pacote offline, sem flags de provedor ou execução real."
  );
const packet = preparePacket(homologationCases),
  directory = resolve(".local/authoring-homologation");
await mkdir(directory, { recursive: true });
const proposalPath = resolve("docs/specs/073-agente-documental-e-pdf/proposta-operacional.json"),
  proposal = JSON.parse(await readFile(proposalPath, "utf8")),
  proposalValidation = validateOperationalProposal(proposal);
const blank = assessReviews(homologationCases, packet.reviewForm);
assert.equal(blank.status, "pending");
const simulated = packet.reviewForm.map((r) => ({
  ...r,
  executionKind: "simulated" as const,
  candidate: {
    modelKey: "simulated-protocol-only",
    promptHash: packetHash("proposed-instructions"),
    outputHash: packetHash(r.caseId),
    revisionHash: packetHash(corpusVersion)
  },
  reviewerId: "synthetic-reviewer",
  qualification: "simulação de protocolo; nenhuma revisão humana realizada",
  reviewedAt: "2026-11-17T12:00:00Z",
  checks: Object.fromEntries(reviewChecks.map((k) => [k, true])) as typeof r.checks,
  usabilityScore: 2,
  justification: "SIMULADO: valida somente o protocolo de coleta."
}));
const allPositive = assessReviews(homologationCases, simulated);
assert.equal(allPositive.semanticApproved, 0);
assert.equal(allPositive.status, "pending");
const critical = structuredClone(simulated);
critical[0]!.checks.negation = false;
assert.equal(assessReviews(homologationCases, critical).status, "rejected");
const rehearsal = await rehearseOperations();
const summary = {
  corpusVersion,
  corpusHash: packet.corpusHash,
  syntheticOnly: true,
  realProviderCalls: 0,
  realModelQualityMeasured: false,
  semanticApproved: 0,
  productionAuthorized: false,
  totalCases: homologationCases.length,
  documentCases: homologationCases.filter((c) => c.input.mode === "document").length,
  audioScriptCases: homologationCases.filter((c) => c.input.mode !== "document").length,
  audioEligibleCases: homologationCases.filter((c) => c.input.audioEligible).length,
  humanReviewStatus: "pending",
  protocolChecks: {
    blankStaysPending: true,
    simulationNeverApproves: true,
    criticalFailureBlocksAggregate: true
  },
  proposalHash: packetHash(proposal),
  proposalValidation,
  rehearsal
};
await writeFile(
  resolve(directory, "inputs.json"),
  JSON.stringify(
    { corpusVersion, corpusHash: packet.corpusHash, syntheticOnly: true, cases: packet.inputs },
    null,
    2
  )
);
await writeFile(
  resolve(directory, "reviewer-packet.json"),
  JSON.stringify(
    { corpusVersion, corpusHash: packet.corpusHash, cases: packet.reviewerPacket },
    null,
    2
  )
);
await writeFile(
  resolve(directory, "review-form.template.json"),
  JSON.stringify(packet.reviewForm, null, 2)
);
await writeFile(resolve(directory, "results.synthetic.json"), JSON.stringify(summary, null, 2));
await writeFile(
  resolve(directory, "results.junit.xml"),
  `<?xml version="1.0" encoding="UTF-8"?><testsuites><testsuite name="spec-073-preparation-contracts" tests="${rehearsal.steps.length + 3}" failures="0">${["blank-pending", "simulation-not-approval", "critical-blocks", ...rehearsal.steps.map((s) => s.id)].map((id) => `<testcase classname="synthetic-contract-only" name="${id}"/>`).join("")}</testsuite></testsuites>`
);
const ciDirectory = resolve("reports");
await mkdir(ciDirectory, { recursive: true });
await writeFile(
  resolve(ciDirectory, "authoring-homologation-synthetic.json"),
  JSON.stringify(summary, null, 2)
);
await writeFile(
  resolve(ciDirectory, "authoring-homologation-reviewer-packet.json"),
  JSON.stringify(
    { corpusVersion, corpusHash: packet.corpusHash, cases: packet.reviewerPacket },
    null,
    2
  )
);
await writeFile(
  resolve(ciDirectory, "authoring-homologation-review-form.template.json"),
  JSON.stringify(packet.reviewForm, null, 2)
);
await writeFile(
  resolve(ciDirectory, "authoring-homologation.junit.xml"),
  await readFile(resolve(directory, "results.junit.xml"))
);
process.stdout.write(
  JSON.stringify(
    {
      cases: summary.totalCases,
      audioScripts: summary.audioScriptCases,
      audioEligible: summary.audioEligibleCases,
      operationalSteps: rehearsal.steps.length,
      realProviderCalls: 0,
      realModelQualityMeasured: false,
      semanticApproved: 0,
      productionAuthorized: false,
      outputDirectory: directory
    },
    null,
    2
  ) + "\n"
);
