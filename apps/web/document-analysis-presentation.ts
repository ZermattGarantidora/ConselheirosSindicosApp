type CitationIdentity = Readonly<{
  documentId: string;
  documentVersionId: string;
  page: number;
  startOffset: number;
  endOffset: number;
  excerpt: string;
  sourceScope?: "condominium" | "legislation";
  sourceRemoved?: boolean;
}>;

/** Agrupa a apresentação, preservando cada trecho e sua origem verificável. */
export function groupCitations<T extends CitationIdentity>(
  citations: readonly T[]
): readonly T[][] {
  const groups = new Map<string, T[]>();
  for (const citation of citations) {
    const key = JSON.stringify([
      citation.documentId,
      citation.documentVersionId,
      citation.sourceScope ?? "condominium",
      citation.sourceRemoved ?? false
    ]);
    const group = groups.get(key) ?? [];
    if (
      !group.some(
        (item) =>
          item.page === citation.page &&
          item.startOffset === citation.startOffset &&
          item.endOffset === citation.endOffset &&
          item.excerpt === citation.excerpt
      )
    )
      group.push(citation);
    groups.set(key, group);
  }
  return [...groups.values()];
}
