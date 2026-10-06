import type { DocumentType } from "./document-model.js";

export type DocumentIdentification = Readonly<{
  documentType: DocumentType;
  identified: boolean;
}>;

type IdentificationRule = Readonly<{
  documentType: Exclude<DocumentType, "other">;
  patterns: readonly RegExp[];
}>;

const identificationRules: readonly IdentificationRule[] = [
  {
    documentType: "convention",
    patterns: [
      /\bconven[cç][aã]o\s+(?:do|de)\s+condom[ií]nio\b/iu,
      /\bconven[cç][aã]o\s+condominial\b/iu
    ]
  },
  {
    documentType: "internal_rules",
    patterns: [/\bregimento\s+interno\b/iu]
  },
  {
    documentType: "meeting_minutes",
    patterns: [/\bata\s+(?:da|de)\s+(?:assembleia|reuni[aã]o)\b/iu, /\bata\s+de\s+assembleia\b/iu]
  },
  {
    documentType: "contract",
    patterns: [/\bcontrato\s+(?:de|para)\b/iu, /\bcontratante\b[\s\S]{0,400}\bcontratada\b/iu]
  }
];

const unidentifiedDocument: DocumentIdentification = Object.freeze({
  documentType: "other",
  identified: false
});

/**
 * Labels a document only when its extracted text has a direct, narrow signal.
 * Extracted text remains untrusted data; this function never interprets or executes it.
 */
export function identifyDocumentType(extractedText: string): DocumentIdentification {
  const text = extractedText.trim();
  if (text.length === 0) return unidentifiedDocument;

  const matched = identificationRules.find((rule) =>
    rule.patterns.some((pattern) => pattern.test(text))
  );
  return matched === undefined
    ? unidentifiedDocument
    : Object.freeze({ documentType: matched.documentType, identified: true });
}
