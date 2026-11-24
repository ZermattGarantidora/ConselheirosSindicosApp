import { officialWebUrl, publicSourceUrl } from "../shared/demo-web-research.js";

export type MessageSegment = Readonly<{
  text: string;
  bold: boolean;
  href?: string;
}>;

/** Interpreta somente **negrito**; todo o restante continua sendo texto literal seguro. */
export function splitBoldText(text: string): readonly MessageSegment[] {
  return Object.freeze(
    text
      .split(/(\*\*[^*\n]+\*\*)/gu)
      .filter((segment) => segment.length > 0)
      .map((segment) =>
        segment.startsWith("**") && segment.endsWith("**")
          ? Object.freeze({ text: segment.slice(2, -2), bold: true })
          : Object.freeze({ text: segment, bold: false })
      )
  );
}
/** Fontes públicas referenciadas e a raiz empresarial verificada; nunca interpreta HTML. */
export function splitMessageText(text: string): readonly MessageSegment[] {
  const segments: MessageSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(/\[([^\]\n]{1,120})\]\((https:\/\/[^()\s]{1,2048})\)/gu)) {
    const href =
      officialWebUrl(match[2]!) ??
      (/^Fonte [1-3]$/u.test(match[1]!) ? publicSourceUrl(match[2]!) : undefined) ??
      (match[2] === "https://www.zermattgarantidora.com.br/" ? match[2] : undefined);
    if (!href) continue;
    segments.push(...splitBoldText(text.slice(cursor, match.index)), {
      text: match[1]!,
      bold: false,
      href
    });
    cursor = match.index + match[0].length;
  }
  segments.push(...splitBoldText(text.slice(cursor)));
  return Object.freeze(segments);
}
