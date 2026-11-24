import { authoringLimits } from "../../apps/api/authoring/document-authoring-contract.js";
import { audioLimits } from "../../apps/api/authoring/audio-transcription.js";
const record = (v: unknown): v is Record<string, unknown> =>
  Boolean(v && typeof v === "object" && !Array.isArray(v));
export function validateOperationalProposal(raw: unknown) {
  if (
    !record(raw) ||
    raw.version !== "authoring-operations-proposal-v1" ||
    raw.state !== "proposed-not-approved" ||
    raw.enabled !== false ||
    raw.environment !== "synthetic-local-only" ||
    raw.externalCallsEnabled !== false ||
    raw.externalSpendingMicrounits !== 0 ||
    raw.provider !== null ||
    raw.target !== null
  )
    throw new Error("Proposta deve permanecer sintética, inativa, sem destino ou consumo externo.");
  const retention = raw.retentionProposed,
    limits = raw.limitsProposed,
    maintenance = raw.maintenanceProposed,
    recovery = raw.recoveryProposed,
    approvals = raw.approvals;
  const history = raw.historyProposed;
  if (
    !record(history) ||
    history.permanentConversation !== true ||
    history.noSilentMessageDeletion !== true ||
    history.artifactHistoryCompatibility !== "pending"
  )
    throw new Error(
      "Retenção de artefatos não pode aprovar perda silenciosa do histórico permanente."
    );
  if (
    !record(retention) ||
    !record(limits) ||
    !record(maintenance) ||
    !record(recovery) ||
    !record(approvals) ||
    !record(raw.responsibilitiesProposed)
  )
    throw new Error("Proposta operacional incompleta.");
  for (const role of ["product", "operations", "securityAndData", "reviewer", "engineering"])
    if (
      typeof raw.responsibilitiesProposed[role] !== "string" ||
      !String(raw.responsibilitiesProposed[role]).trim()
    )
      throw new Error("Responsabilidades propostas incompletas.");
  if (
    !Number.isSafeInteger(retention.draftSeconds) ||
    Number(retention.draftSeconds) < 1 ||
    Number(retention.draftSeconds) > 604800 ||
    !Number.isSafeInteger(retention.audioSeconds) ||
    Number(retention.audioSeconds) < 1 ||
    Number(retention.audioSeconds) > Number(retention.draftSeconds) ||
    retention.transcriptSeconds !== retention.audioSeconds ||
    retention.exportStored !== false ||
    retention.consumptionAndTombstoneDays !== null
  )
    throw new Error("Retenção proposta incompatível ou decisão de consumo não preservada.");
  const ceilings = {
    maximumSources: authoringLimits.sources,
    maximumSourceCharacters: authoringLimits.sourceCharacters,
    maximumAudioBytes: audioLimits.meeting.maximumBytes,
    dictationSeconds: audioLimits.dictation.maximumSeconds,
    meetingSeconds: audioLimits.meeting.maximumSeconds,
    automaticOriginalBlockCharacters: 1000,
    maintenanceBatch: 50,
    maximumFamily: 100,
    maximumInventory: 10000
  };
  for (const [k, max] of Object.entries(ceilings))
    if (!Number.isSafeInteger(limits[k]) || Number(limits[k]) < 1 || Number(limits[k]) > max)
      throw new Error(`Limite proposto excede capacidade implementada: ${k}.`);
  for (const k of [
    "scopeDailyOperations",
    "globalDailyOperations",
    "scopeConcurrent",
    "globalConcurrent"
  ])
    if (!Number.isSafeInteger(limits[k]) || Number(limits[k]) < 1)
      throw new Error("Cota proposta inválida.");
  if (
    Number(limits.scopeDailyOperations) > Number(limits.globalDailyOperations) ||
    Number(limits.scopeConcurrent) > Number(limits.globalConcurrent) ||
    Number(limits.globalConcurrent) > Number(limits.globalDailyOperations)
  )
    throw new Error("Cotas propostas inconsistentes.");
  if (
    maintenance.scheduled !== false ||
    maintenance.scopeRequired !== true ||
    maintenance.callsModels !== false ||
    !Number.isSafeInteger(maintenance.intervalMinutes) ||
    Number(maintenance.intervalMinutes) < 1
  )
    throw new Error("Manutenção não pode ativar agendamento ou IA.");
  for (const key of [
    "cofreOutsideDump",
    "lifecycleOutsideDump",
    "missingCofreQuarantines",
    "restoreStartsQuarantined",
    "reapplyDeletionAndRevocation"
  ])
    if (recovery[key] !== true) throw new Error("Recuperação deve manter cercas e quarentena.");
  if (
    recovery.retryUnknownDispatch !== false ||
    recovery.targetsMeasured !== false ||
    ![recovery.sqlRpoMinutes, recovery.rtoMinutes].every(
      (v) => Number.isSafeInteger(v) && Number(v) > 0
    )
  )
    throw new Error("Metas de recuperação não são evidência nem autorização de retry.");
  const required = [
    "dataPolicy",
    "retentionAndConsumption",
    "historyRetentionCompatibility",
    "providerAndSpending",
    "targetAndCustody",
    "namedOperationsOwner",
    "realModelQuality",
    "independentReview",
    "ciCommit",
    "release"
  ];
  if (
    Object.keys(approvals).length !== required.length ||
    required.some((k) => approvals[k] !== null)
  )
    throw new Error("Proposta não registra aprovações fictícias.");
  return {
    valid: true,
    activationAuthorized: false,
    proposedRetentionSeconds: retention.draftSeconds,
    pendingDecisions: required
  };
}
