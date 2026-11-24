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

/** Presentation category only: a filename or a mention in prose cannot label a statement. */
export function identifyFinancialStatement(
  pages: readonly Readonly<{ extractedText: string }>[]
): boolean {
  const headings = pages.map((page) => page.extractedText.slice(0, 1024));
  if (
    headings.some(
      (text) =>
        /^\s*(?:conven[cç][aã]o|regimento|ata|contrato|extrato|nota\s+fiscal|recibo)\b/imu.test(
          text
        ) || identificationRules.some((rule) => rule.patterns.some((pattern) => pattern.test(text)))
    )
  )
    return false;
  return headings.some((text) =>
    /^\s*(?:balancete\b|presta[cç][aã]o\s+de\s+contas\b)/imu.test(text)
  );
}

/**
 * Labels a document only when its extracted text has a direct, narrow signal.
 * Extracted text remains untrusted data; this function never interprets or executes it.
 */
export function identifyDocumentType(extractedText: string): DocumentIdentification {
  return identifyDocumentPages([{ extractedText }]);
}

/** Scans every page without copying the whole document or selecting one conflicting type. */
export function identifyDocumentPages(
  pages: readonly Readonly<{ extractedText: string }>[]
): DocumentIdentification {
  const matched = new Set<Exclude<DocumentType, "other">>();
  for (const page of pages) {
    for (const rule of identificationRules) {
      if (rule.patterns.some((pattern) => pattern.test(page.extractedText))) {
        matched.add(rule.documentType);
      }
    }
  }
  return matched.size !== 1
    ? unidentifiedDocument
    : Object.freeze({ documentType: [...matched][0]!, identified: true });
}
