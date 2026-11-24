/** Fatias literais: não quebra milhares/decimais, artigos nem delimitadores Markdown. */
export function literalSentences(
  value: string
): readonly Readonly<{ text: string; start: number }>[] {
  const spans: { text: string; start: number }[] = [];
  let start = 0;
  const append = (end: number) => {
    const raw = value.slice(start, end);
    const text = raw.trim();
    if (text !== "") spans.push({ text, start: start + raw.indexOf(text) });
    start = end;
  };
  for (const match of value.matchAll(/[.!?][*_~]*(?=\s|$)|\n+/gu)) {
    if (
      match[0].startsWith(".") &&
      /\b(?:art|arts|sr|sra|dr|dra|n)\.$/iu.test(value.slice(start, match.index + 1))
    )
      continue;
    append(match.index + match[0].length);
  }
  append(value.length);
  return Object.freeze(spans.map((span) => Object.freeze(span)));
}
