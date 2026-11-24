import { crc32, inflateRawSync } from "node:zlib";

export const docxMediaType =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document" as const;
export const maximumDocxBytes = 10 * 1024 * 1024;
export class InvalidDocxError extends Error {}
const invalid = (): never => {
  throw new InvalidDocxError("Word inválido, protegido ou fora dos limites de leitura segura.");
};

/** Subconjunto fechado de OPC/ZIP. Nada é extraído para o disco ou resolvido na rede. */
function entries(buffer: Buffer): Map<string, Buffer> {
  if (buffer.length < 22 || buffer.length > maximumDocxBytes) invalid();
  let end = buffer.length - 22;
  while (end >= Math.max(0, buffer.length - 65_557) && buffer.readUInt32LE(end) !== 0x06054b50)
    end--;
  if (
    end < 0 ||
    buffer.readUInt32LE(end) !== 0x06054b50 ||
    end + 22 + buffer.readUInt16LE(end + 20) !== buffer.length ||
    buffer.readUInt32LE(end + 4) !== 0
  )
    invalid();
  const count = buffer.readUInt16LE(end + 10),
    start = buffer.readUInt32LE(end + 16);
  if (
    count < 1 ||
    count > 256 ||
    count !== buffer.readUInt16LE(end + 8) ||
    start + buffer.readUInt32LE(end + 12) !== end
  )
    invalid();
  const result = new Map<string, Buffer>();
  let position = start,
    expanded = 0;
  const spans: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    if (position + 46 > end || buffer.readUInt32LE(position) !== 0x02014b50) invalid();
    const flags = buffer.readUInt16LE(position + 8),
      method = buffer.readUInt16LE(position + 10);
    const checksum = buffer.readUInt32LE(position + 16),
      compressed = buffer.readUInt32LE(position + 20),
      size = buffer.readUInt32LE(position + 24);
    const nameSize = buffer.readUInt16LE(position + 28),
      extra = buffer.readUInt16LE(position + 30),
      comment = buffer.readUInt16LE(position + 32),
      local = buffer.readUInt32LE(position + 42);
    if (
      (flags & ~0x808) !== 0 ||
      ![0, 8].includes(method) ||
      position + 46 + nameSize + extra + comment > end ||
      buffer.readUInt16LE(position + 34) !== 0
    )
      invalid();
    const nameBytes = buffer.subarray(position + 46, position + 46 + nameSize);
    const name = nameBytes.toString("utf8");
    if (
      !/^[A-Za-z0-9_[\]./ -]+$/u.test(name) ||
      name.startsWith("/") ||
      name.split("/").includes("..") ||
      result.has(name) ||
      /vba|embeddings\//iu.test(name)
    )
      invalid();
    if (((buffer.readUInt32LE(position + 38) >>> 16) & 0xf000) === 0xa000) invalid();
    expanded += size;
    if (
      size > 8 * 1024 * 1024 ||
      expanded > 32 * 1024 * 1024 ||
      size > Math.max(1, compressed) * 2000 ||
      local + 30 > start ||
      buffer.readUInt32LE(local) !== 0x04034b50
    )
      invalid();
    const localNameSize = buffer.readUInt16LE(local + 26),
      localExtra = buffer.readUInt16LE(local + 28);
    const data = local + 30 + localNameSize + localExtra;
    if (
      buffer.readUInt16LE(local + 6) !== flags ||
      buffer.readUInt16LE(local + 8) !== method ||
      !buffer.subarray(local + 30, local + 30 + localNameSize).equals(nameBytes) ||
      data + compressed > start ||
      spans.some(([a, b]) => local < b && data + compressed > a)
    )
      invalid();
    spans.push([local, data + compressed]);
    let value: Buffer;
    try {
      value =
        method === 0
          ? buffer.subarray(data, data + compressed)
          : inflateRawSync(buffer.subarray(data, data + compressed), {
              maxOutputLength: Math.max(1, size)
            });
    } catch {
      return invalid();
    }
    if (value.length !== size || crc32(value) !== checksum) invalid();
    result.set(name, value);
    position += 46 + nameSize + extra + comment;
  }
  if (position !== end) invalid();
  return result;
}
function decode(value: string): string {
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[a-f\d]+;)/iu.test(value)) invalid();
  return value.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[a-f\d]+);/giu, (_, entity: string) => {
    const predefined: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    if (entity in predefined) return predefined[entity]!;
    const code = entity.startsWith("#x")
      ? Number.parseInt(entity.slice(2), 16)
      : Number.parseInt(entity.slice(1), 10);
    if (
      !Number.isSafeInteger(code) ||
      code > 0x10ffff ||
      (code < 32 && ![9, 10, 13].includes(code)) ||
      (code >= 0xd800 && code <= 0xdfff)
    )
      invalid();
    return String.fromCodePoint(code);
  });
}
type XmlEvent =
  | { name: string; closing: boolean; attributes: Readonly<Record<string, string>> }
  | { text: string };
/** XML sem DTD/entidades externas, com árvore e atributos limitados. */
function parseXml(buffer: Buffer, visit: (event: XmlEvent) => void): void {
  let xml: string;
  try {
    xml = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return invalid();
  }
  if (/<!DOCTYPE|<!ENTITY|<!\[CDATA\[/iu.test(xml) || /\p{Cc}/u.test(xml.replace(/[\t\r\n]/gu, "")))
    invalid();
  const stack: string[] = [];
  const token =
    /<!--[\s\S]*?-->|<\?xml\s[^?]*\?>|<\/?[A-Za-z_][\w:.-]*(?:[^<>"']|"[^"]*"|'[^']*')*>|[^<]+/gu;
  let position = 0,
    roots = 0;
  for (const match of xml.matchAll(token)) {
    if (match.index !== position) invalid();
    const part = match[0];
    position += part.length;
    if (part.startsWith("<!--") || part.startsWith("<?xml")) continue;
    if (!part.startsWith("<")) {
      if (!stack.length && part.trim()) invalid();
      visit({ text: decode(part) });
      continue;
    }
    const name = /^<\/?([\w:.-]+)/u.exec(part)![1]!;
    const closing = part.startsWith("</"),
      self = part.endsWith("/>");
    const attributes: Record<string, string> = Object.create(null);
    const tail = part.slice((closing ? 3 : 2) + name.length - 1, self ? -2 : -1);
    if (closing) {
      if (tail.trim() || stack.pop() !== name) invalid();
      visit({ name, closing: true, attributes });
      continue;
    }
    let consumed = 0,
      attributeCount = 0;
    for (const attr of tail.matchAll(/\s+([\w:.-]+)\s*=\s*(?:"([^"<]*)"|'([^'<]*)')/gu)) {
      if (attr.index !== consumed || ++attributeCount > 256 || attr[1]! in attributes) invalid();
      consumed += attr[0].length;
      attributes[attr[1]!] = decode(attr[2] ?? attr[3]!);
    }
    if (tail.slice(consumed).trim() || stack.length >= 128) invalid();
    if (!stack.length && ++roots > 1) invalid();
    visit({ name, closing: false, attributes });
    if (self) visit({ name, closing: true, attributes });
    else stack.push(name);
  }
  if (position !== xml.length || stack.length || roots !== 1) invalid();
}

export type DocxExtraction = Readonly<{
  blocks: readonly Readonly<{ locator: string; text: string }>[];
  complete: boolean;
  limitations: readonly string[];
}>;
export function extractDocxText(content: Buffer): DocxExtraction {
  const files = entries(content);
  if (
    !files.has("[Content_Types].xml") ||
    !files.has("_rels/.rels") ||
    !files.has("word/document.xml")
  )
    invalid();
  const warnings = new Set<string>();
  for (const [name, value] of files) {
    if (!/\.xml$|\.rels$/u.test(name)) {
      if (!name.endsWith("/")) warnings.add("Objetos e imagens não foram interpretados.");
      continue;
    }
    parseXml(value, (event) => {
      if ("text" in event || event.closing) return;
      if (
        event.attributes.TargetMode?.toLowerCase() === "external" ||
        /^(?:[a-z][a-z\d+.-]*:|\/\/)/iu.test(event.attributes.Target ?? "") ||
        /macroEnabled|vbaProject/iu.test(Object.values(event.attributes).join(" "))
      )
        invalid();
    });
    if (/word\/(header|footer|footnote|endnote|comment)/u.test(name))
      warnings.add("Cabeçalhos, rodapés, notas ou comentários exigem conferência no original.");
  }
  const blocks: { locator: string; text: string }[] = [];
  let paragraph = "",
    paragraphDepth = 0,
    inText = false,
    root = false,
    characters = 0,
    first = true;
  const supported = new Set(
    "document body p pPr r rPr t tab br cr tbl tblPr tblGrid gridCol tr trPr tc tcPr sectPr type pgSz pgMar cols docGrid jc spacing ind b i color sz szCs rFonts lang u highlight vertAlign borders top left bottom right insideH insideV tblW tcW gridSpan vMerge keepNext keepLines contextualSpacing cantSplit tblLayout tblLook shd"
      .split(" ")
      .map((name) => `w:${name}`)
  );
  parseXml(files.get("word/document.xml")!, (event) => {
    if ("text" in event) {
      if (inText) paragraph += event.text;
      return;
    }
    if (first) {
      first = false;
      if (event.name !== "w:document" || event.closing) invalid();
    }
    if (
      event.attributes["xmlns:w"] &&
      event.attributes["xmlns:w"] !== "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    )
      invalid();
    if (event.name === "w:document" && !event.closing) {
      root =
        event.attributes["xmlns:w"] ===
        "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    }
    if (!event.closing && !supported.has(event.name))
      warnings.add(
        "Há conteúdo, numeração ou revisão de Word que precisa de conferência no original."
      );
    if (!event.closing && event.name === "w:tbl")
      warnings.add(
        "Tabelas exigem conferência no original; a leitura por blocos não preserva relações entre células."
      );
    if (event.name === "w:p") {
      if (!event.closing) {
        if (++paragraphDepth !== 1) invalid();
        paragraph = "";
      } else {
        if (--paragraphDepth !== 0) invalid();
        const text = paragraph.trim();
        characters += text.length;
        if (characters > 120_000 || blocks.length >= 500) invalid();
        if (text) blocks.push({ locator: `Bloco ${blocks.length + 1} (sem paginação Word)`, text });
      }
    }
    if (event.name === "w:t") {
      if (inText === !event.closing || !paragraphDepth) invalid();
      inText = !event.closing;
    }
    if (
      !event.closing &&
      (event.name === "w:tab" || event.name === "w:br" || event.name === "w:cr")
    )
      paragraph += event.name === "w:tab" ? "\t" : "\n";
  });
  if (!root || !blocks.length || paragraphDepth || inText) invalid();
  return { blocks, complete: !warnings.size, limitations: [...warnings] };
}
