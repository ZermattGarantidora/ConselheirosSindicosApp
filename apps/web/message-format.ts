export type MessageSegment = Readonly<{
  text: string;
  bold: boolean;
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
