/** IDs completos, sem correspondência de prefixo (ART-0059 não é ART-00590). */
export function explicitRecordIds(text: string): readonly string[] {
  return [
    ...new Set(
      [...text.matchAll(/\b[\p{L}]{2,12}-[\p{L}\p{N}]*\d[\p{L}\p{N}]*\b/gu)].map((m) =>
        m[0].toUpperCase()
      )
    )
  ];
}
export function containsExactRecordId(text: string, id: string): boolean {
  return explicitRecordIds(text).includes(id.toUpperCase());
}
export function definesRecord(text: string, id: string): boolean {
  return text
    .split(/\r?\n/u)
    .some((line) => new RegExp(`^\\s*(?:\\|\\s*)?${id}\\s*(?:[|:;]|—|–|\\s[-])`, "iu").test(line));
}
