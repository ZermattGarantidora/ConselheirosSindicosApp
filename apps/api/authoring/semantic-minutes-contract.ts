import { Ajv } from "ajv";
import { conversationHash } from "../answers/conversation-store.js";
import { DocumentDraftError } from "./document-drafts.js";
import type { AudioInput } from "./audio-inputs.js";

import { audioMinutesGenerationKind } from "../../shared/audio-minutes.js";
export const semanticMinutesVersion = audioMinutesGenerationKind;
export const minutesLimits = Object.freeze({
  inputBytes: 220_000,
  requestBytes: 300_000,
  outputBytes: 60_000,
  writerTokens: 16_000,
  reviewTokens: 12_000
});
export type MinutesReference = Readonly<{ segmentIndex: number; quote: string }>;
export type MinutesClaim = Readonly<{
  id: string;
  text: string;
  references: readonly MinutesReference[];
}>;
export type MinutesDecision = Readonly<{
  outcome: "approved" | "rejected" | "deferred";
  claim: MinutesClaim;
}>;
export const meetingFields = [
  "condominium",
  "date",
  "location",
  "start_time",
  "end_time",
  "chair",
  "secretary",
  "attendees"
] as const;
export const unresolvedKinds = [
  "unclear_audio",
  "missing_vote",
  "conflict",
  "meeting_details",
  "attendance",
  "deadline",
  "other"
] as const;
export type MinutesPlan = Readonly<{
  version: typeof semanticMinutesVersion;
  meeting: readonly Readonly<{ field: (typeof meetingFields)[number]; claim: MinutesClaim }>[];
  topics: readonly Readonly<{
    title: string;
    discussion: readonly MinutesClaim[];
    proposals: readonly MinutesClaim[];
    decisions: readonly MinutesDecision[];
    actions: readonly Readonly<{
      description: MinutesClaim;
      owner: MinutesClaim | null;
      deadline: MinutesClaim | null;
    }>[];
  }>[];
  unresolved: readonly Readonly<{
    kind: (typeof unresolvedKinds)[number];
    segmentIndexes: readonly number[];
  }>[];
  coverage: readonly Readonly<{
    segmentIndex: number;
    disposition: "used" | "non_material" | "uncertain";
    statementIds: readonly string[];
  }>[];
}>;
export type ClaimKind =
  | "meeting_detail"
  | "discussion"
  | "proposal"
  | "decision_approved"
  | "decision_rejected"
  | "decision_deferred"
  | "action_description"
  | "action_owner"
  | "action_deadline";
export type MinutesReview = Readonly<{
  status: "accepted" | "rejected";
  sourceHash: string;
  planHash: string;
  statements: readonly Readonly<{ id: string; supported: boolean; kind: ClaimKind }>[];
  segments: readonly Readonly<{ segmentIndex: number; adequate: boolean }>[];
  issues: readonly string[];
}>;
const object = (properties: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties
});
const text = { type: "string", minLength: 1, maxLength: 3000 };
const index = { type: "integer", minimum: 0, maximum: 1999 };
const reference = object({
  segmentIndex: index,
  quote: { type: "string", minLength: 1, maxLength: 1500 }
});
const claim = object({
  id: { type: "string", pattern: "^[a-zA-Z0-9_-]{1,60}$" },
  text,
  references: { type: "array", minItems: 1, maxItems: 6, items: reference }
});
const claimRef = { $ref: "#/$defs/claim" };
const claims = { type: "array", maxItems: 80, items: claimRef };
export const minutesPlanSchema = {
  ...object({
    version: { type: "string", enum: [semanticMinutesVersion] },
    meeting: {
      type: "array",
      maxItems: 30,
      items: object({ field: { type: "string", enum: meetingFields }, claim: claimRef })
    },
    topics: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: object({
        title: { type: "string", minLength: 1, maxLength: 200 },
        discussion: claims,
        proposals: claims,
        decisions: {
          type: "array",
          maxItems: 30,
          items: object({
            outcome: { type: "string", enum: ["approved", "rejected", "deferred"] },
            claim: claimRef
          })
        },
        actions: {
          type: "array",
          maxItems: 30,
          items: object({
            description: claimRef,
            owner: { anyOf: [claimRef, { type: "null" }] },
            deadline: { anyOf: [claimRef, { type: "null" }] }
          })
        }
      })
    },
    unresolved: {
      type: "array",
      maxItems: 2000,
      items: object({
        kind: { type: "string", enum: unresolvedKinds },
        segmentIndexes: { type: "array", maxItems: 2000, items: index }
      })
    },
    coverage: {
      type: "array",
      minItems: 1,
      maxItems: 2000,
      items: object({
        segmentIndex: index,
        disposition: { type: "string", enum: ["used", "non_material", "uncertain"] },
        statementIds: { type: "array", maxItems: 80, items: { type: "string" } }
      })
    }
  }),
  $defs: { claim }
};
export const minutesReviewSchema = object({
  status: { type: "string", enum: ["accepted", "rejected"] },
  sourceHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
  planHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
  statements: {
    type: "array",
    maxItems: 80,
    items: object({
      id: { type: "string" },
      supported: { type: "boolean" },
      kind: {
        type: "string",
        enum: [
          "meeting_detail",
          "discussion",
          "proposal",
          "decision_approved",
          "decision_rejected",
          "decision_deferred",
          "action_description",
          "action_owner",
          "action_deadline"
        ]
      }
    })
  },
  segments: {
    type: "array",
    maxItems: 2000,
    items: object({ segmentIndex: index, adequate: { type: "boolean" } })
  },
  issues: {
    type: "array",
    maxItems: 100,
    items: {
      type: "string",
      enum: [
        "unsupported_fact",
        "invented_number",
        "negation",
        "decision_not_supported",
        "omitted_material_topic",
        "uncertain_audio",
        "contradiction",
        "identity_inferred",
        "unsupported_heading",
        "other"
      ]
    }
  }
});
const ajv = new Ajv({ allErrors: false, strict: true });
const isPlan = ajv.compile<MinutesPlan>(minutesPlanSchema),
  isReview = ajv.compile<MinutesReview>(minutesReviewSchema);
export function semanticHash(value: unknown): string {
  const canonical = (item: unknown): unknown =>
    Array.isArray(item)
      ? item.map(canonical)
      : item !== null && typeof item === "object"
        ? Object.fromEntries(
            Object.entries(item)
              .sort(([a], [b]) => a.localeCompare(b, "en"))
              .map(([key, v]) => [key, canonical(v)])
          )
        : item;
  return conversationHash(canonical(value));
}
const invalid = (code: string): never => {
  throw new DocumentDraftError(
    422,
    `A redação da ata não passou na conferência (${code}). Nenhuma proposta foi liberada.`
  );
};
export function planClaims(
  plan: MinutesPlan
): readonly Readonly<{ claim: MinutesClaim; kind: ClaimKind }>[] {
  return [
    ...plan.meeting.map((field) => ({ claim: field.claim, kind: "meeting_detail" as const })),
    ...plan.topics.flatMap((topic) => [
      ...topic.discussion.map((claim) => ({ claim, kind: "discussion" as const })),
      ...topic.proposals.map((claim) => ({ claim, kind: "proposal" as const })),
      ...topic.decisions.map((value) => ({
        claim: value.claim,
        kind: `decision_${value.outcome}` as ClaimKind
      })),
      ...topic.actions.flatMap((action) => [
        { claim: action.description, kind: "action_description" as const },
        ...(action.owner ? [{ claim: action.owner, kind: "action_owner" as const }] : []),
        ...(action.deadline ? [{ claim: action.deadline, kind: "action_deadline" as const }] : [])
      ])
    ])
  ];
}
function numbers(value: string): string[] {
  return value.match(/\d+(?:[.,:/-]\d+)*(?:%)?/gu) ?? [];
}
export function validateMinutesPlan(raw: unknown, input: AudioInput): MinutesPlan {
  if (Buffer.byteLength(JSON.stringify(raw) ?? "") > minutesLimits.outputBytes || !isPlan(raw))
    return invalid("invalid_plan");
  const all = planClaims(raw),
    ids = new Map<string, MinutesClaim>();
  if (!all.length || all.length > 80) return invalid("claim_count");
  const fields = new Set<string>();
  for (const field of raw.meeting) {
    if (field.field !== "attendees" && fields.has(field.field)) return invalid("duplicate_field");
    fields.add(field.field);
  }
  for (const { claim } of all) {
    if (ids.has(claim.id) || /\p{Cc}/u.test(claim.text.replace(/[\t\r\n]/gu, "")))
      return invalid("duplicate_or_invalid_claim");
    ids.set(claim.id, claim);
    const quotes: string[] = [];
    for (const reference of claim.references) {
      const source = input.segments[reference.segmentIndex];
      if (!source || source.uncertain || !source.text.includes(reference.quote))
        return invalid("unsupported_reference");
      quotes.push(reference.quote);
    }
    const supported = new Set(numbers(quotes.join(" ")));
    if (numbers(claim.text).some((number) => !supported.has(number)))
      return invalid("invented_number");
  }
  const coverage = new Map<number, MinutesPlan["coverage"][number]>();
  for (const entry of raw.coverage) {
    if (
      !input.segments[entry.segmentIndex] ||
      coverage.has(entry.segmentIndex) ||
      new Set(entry.statementIds).size !== entry.statementIds.length
    )
      return invalid("invalid_coverage");
    coverage.set(entry.segmentIndex, entry);
    if (entry.disposition === "used") {
      if (
        !entry.statementIds.length ||
        entry.statementIds.some(
          (id) => !ids.get(id)?.references.some((ref) => ref.segmentIndex === entry.segmentIndex)
        )
      )
        return invalid("coverage_claim_mismatch");
    } else if (entry.statementIds.length) return invalid("coverage_claim_mismatch");
    if (input.segments[entry.segmentIndex]!.uncertain && entry.disposition !== "uncertain")
      return invalid("uncertain_as_fact");
  }
  if (coverage.size !== input.segments.length) return invalid("incomplete_coverage");
  for (const { claim } of all)
    for (const reference of claim.references) {
      const entry = coverage.get(reference.segmentIndex)!;
      if (entry.disposition !== "used" || !entry.statementIds.includes(claim.id))
        return invalid("reference_not_covered");
    }
  for (const item of raw.unresolved)
    if (
      item.segmentIndexes.some((i) => !input.segments[i]) ||
      new Set(item.segmentIndexes).size !== item.segmentIndexes.length
    )
      return invalid("invalid_pending_reference");
  for (const entry of coverage.values())
    if (
      entry.disposition === "uncertain" &&
      !raw.unresolved.some((item) => item.segmentIndexes.includes(entry.segmentIndex))
    )
      return invalid("uncertain_not_pending");
  return raw;
}
export function validateMinutesReview(
  raw: unknown,
  plan: MinutesPlan,
  input: AudioInput,
  sourceHash: string
): MinutesReview {
  if (Buffer.byteLength(JSON.stringify(raw) ?? "") > minutesLimits.outputBytes || !isReview(raw))
    return invalid("invalid_review");
  if (
    raw.status !== "accepted" ||
    raw.issues.length ||
    raw.sourceHash !== sourceHash ||
    raw.planHash !== semanticHash(plan)
  )
    return invalid("review_rejected");
  const expected = new Map(planClaims(plan).map(({ claim, kind }) => [claim.id, kind]));
  const reviewed = new Set<string>();
  for (const result of raw.statements) {
    if (reviewed.has(result.id) || expected.get(result.id) !== result.kind || !result.supported)
      return invalid("statement_rejected");
    reviewed.add(result.id);
  }
  const segments = new Set<number>();
  for (const result of raw.segments) {
    if (
      !input.segments[result.segmentIndex] ||
      segments.has(result.segmentIndex) ||
      !result.adequate
    )
      return invalid("segment_rejected");
    segments.add(result.segmentIndex);
  }
  if (reviewed.size !== expected.size || segments.size !== input.segments.length)
    return invalid("incomplete_review");
  return raw;
}
