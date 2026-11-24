import { crc32, deflateSync, inflateSync } from "node:zlib";
import { assertDocumentContent } from "./upload-document.js";

export const photoDocumentLimits = Object.freeze({
  maximumPixels: 12_000_000,
  maximumDecodedBytes: 64 * 1024 * 1024,
  maximumDimension: 16_384
});
type Raster = {
  width: number;
  height: number;
  channels: 1 | 3;
  encoded: Buffer;
  filter: "DCTDecode" | "FlateDecode";
  alpha?: Buffer;
};
export class PhotoDocumentConversionError extends Error {
  constructor() {
    super("A foto não pôde ser convertida integralmente dentro dos limites de leitura.");
    this.name = "PhotoDocumentConversionError";
  }
}
function dimensions(width: number, height: number) {
  if (
    width < 1 ||
    height < 1 ||
    width > photoDocumentLimits.maximumDimension ||
    height > photoDocumentLimits.maximumDimension ||
    width * height > photoDocumentLimits.maximumPixels
  )
    throw new PhotoDocumentConversionError();
}
function jpeg(content: Buffer): Raster {
  let offset = 2;
  while (offset + 4 <= content.length) {
    while (content[offset] === 0xff) offset++;
    const marker = content[offset++]!;
    if (marker === 0xda) break;
    const length = content.readUInt16BE(offset);
    if (length < 2 || offset + length > content.length) throw new PhotoDocumentConversionError();
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      const height = content.readUInt16BE(offset + 3),
        width = content.readUInt16BE(offset + 5),
        channels = content[offset + 7];
      dimensions(width, height);
      if (content[offset + 2] !== 8 || (channels !== 1 && channels !== 3))
        throw new PhotoDocumentConversionError();
      return { width, height, channels, encoded: content, filter: "DCTDecode" };
    }
    offset += length;
  }
  throw new PhotoDocumentConversionError();
}
function paeth(a: number, b: number, c: number) {
  const p = a + b - c,
    pa = Math.abs(p - a),
    pb = Math.abs(p - b),
    pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}
function png(content: Buffer): Raster {
  let offset = 8,
    width = 0,
    height = 0,
    color = -1;
  let palette: Buffer | undefined, transparency: Buffer | undefined;
  const data: Buffer[] = [];
  let dataEnded = false;
  while (offset + 12 <= content.length) {
    const length = content.readUInt32BE(offset),
      type = content.toString("ascii", offset + 4, offset + 8);
    if (
      offset + length + 12 > content.length ||
      crc32(content.subarray(offset + 4, offset + 8 + length)) !==
        content.readUInt32BE(offset + 8 + length)
    )
      throw new PhotoDocumentConversionError();
    const chunk = content.subarray(offset + 8, offset + 8 + length);
    if (data.length && type !== "IDAT") dataEnded = true;
    if (type === "IHDR") {
      if (offset !== 8 || length !== 13) throw new PhotoDocumentConversionError();
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      color = chunk[9]!;
      dimensions(width, height);
      if (
        chunk[8] !== 8 ||
        ![0, 2, 3, 4, 6].includes(color) ||
        chunk[10] !== 0 ||
        chunk[11] !== 0 ||
        chunk[12] !== 0
      )
        throw new PhotoDocumentConversionError();
    } else if (type === "PLTE") {
      if (
        palette ||
        data.length ||
        !length ||
        length > 768 ||
        length % 3 !== 0 ||
        [0, 4].includes(color)
      )
        throw new PhotoDocumentConversionError();
      palette = chunk;
    } else if (type === "tRNS") {
      if (
        transparency ||
        data.length ||
        (color === 3 && (!palette || length > palette.length / 3 || !length)) ||
        (color === 0 && length !== 2) ||
        (color === 2 && length !== 6) ||
        [4, 6].includes(color)
      )
        throw new PhotoDocumentConversionError();
      transparency = chunk;
    } else if (type === "IDAT") {
      if (dataEnded) throw new PhotoDocumentConversionError();
      data.push(chunk);
    } else if (type === "IEND") {
      if (length !== 0 || offset + 12 !== content.length) throw new PhotoDocumentConversionError();
      break;
    } else if (type[0] === type[0]?.toUpperCase()) throw new PhotoDocumentConversionError();
    offset += length + 12;
  }
  if (!data.length || (color === 3 && !palette)) throw new PhotoDocumentConversionError();
  const inputChannels = color === 0 || color === 3 ? 1 : color === 2 ? 3 : color === 4 ? 2 : 4;
  const stride = width * inputChannels,
    decodedLength = (stride + 1) * height;
  if (decodedLength > photoDocumentLimits.maximumDecodedBytes)
    throw new PhotoDocumentConversionError();
  const filtered = inflateSync(Buffer.concat(data), { maxOutputLength: decodedLength });
  if (filtered.length !== decodedLength) throw new PhotoDocumentConversionError();
  const pixels = Buffer.allocUnsafe(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = filtered[y * (stride + 1)]!;
    if (filter > 4) throw new PhotoDocumentConversionError();
    for (let x = 0; x < stride; x++) {
      const at = y * stride + x;
      const a = x >= inputChannels ? pixels[at - inputChannels]! : 0,
        b = y ? pixels[at - stride]! : 0;
      const c = y && x >= inputChannels ? pixels[at - stride - inputChannels]! : 0;
      const prediction =
        filter === 0
          ? 0
          : filter === 1
            ? a
            : filter === 2
              ? b
              : filter === 3
                ? Math.floor((a + b) / 2)
                : paeth(a, b, c);
      pixels[at] = (filtered[y * (stride + 1) + x + 1]! + prediction) & 255;
    }
  }
  const channels = color === 0 || color === 4 ? 1 : 3;
  const rgb = Buffer.allocUnsafe(width * height * channels);
  const alpha =
    [4, 6].includes(color) || transparency ? Buffer.alloc(width * height, 255) : undefined;
  for (let p = 0; p < width * height; p++) {
    const at = p * inputChannels;
    if (color === 3) {
      const index = pixels[at]!;
      if (index >= palette!.length / 3) throw new PhotoDocumentConversionError();
      palette!.copy(rgb, p * 3, index * 3, index * 3 + 3);
      if (alpha) alpha[p] = transparency?.[index] ?? 255;
    } else {
      pixels.copy(rgb, p * channels, at, at + channels);
      if (alpha && [4, 6].includes(color)) alpha[p] = pixels[at + channels]!;
      else if (alpha && transparency) {
        let transparent = true;
        for (let c = 0; c < channels; c++)
          transparent &&= pixels[at + c] === transparency.readUInt16BE(c * 2);
        alpha[p] = transparent ? 0 : 255;
      }
    }
  }
  return {
    width,
    height,
    channels,
    encoded: deflateSync(rgb),
    filter: "FlateDecode",
    ...(alpha ? { alpha: deflateSync(alpha) } : {})
  };
}
function stream(dictionary: string, bytes: Buffer) {
  return Buffer.concat([
    Buffer.from(`<< ${dictionary} /Length ${bytes.length} >>\nstream\n`),
    bytes,
    Buffer.from("\nendstream")
  ]);
}
/** Não gera artefato público: derivado transitório preserva a imagem inteira para OCR de página 1. */
export function photoDocumentPdf(content: Buffer, mediaType: "image/jpeg" | "image/png"): Buffer {
  try {
    assertDocumentContent(content, mediaType);
    const raster = mediaType === "image/jpeg" ? jpeg(content) : png(content);
    const objects = [
      Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
      Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
      Buffer.from(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${raster.width} ${raster.height}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`
      ),
      stream("", Buffer.from(`q ${raster.width} 0 0 ${raster.height} 0 0 cm /Im0 Do Q`)),
      stream(
        `/Type /XObject /Subtype /Image /Width ${raster.width} /Height ${raster.height} /ColorSpace /Device${raster.channels === 1 ? "Gray" : "RGB"} /BitsPerComponent 8 /Filter /${raster.filter}${raster.alpha ? " /SMask 6 0 R" : ""}`,
        raster.encoded
      )
    ];
    if (raster.alpha)
      objects.push(
        stream(
          `/Type /XObject /Subtype /Image /Width ${raster.width} /Height ${raster.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`,
          raster.alpha
        )
      );
    const output = [Buffer.from("%PDF-1.7\n%\xe2\xe3\xcf\xd3\n", "binary")],
      offsets = [0];
    let position = output[0]!.length;
    for (const [index, object] of objects.entries()) {
      offsets.push(position);
      const part = Buffer.concat([
        Buffer.from(`${index + 1} 0 obj\n`),
        object,
        Buffer.from("\nendobj\n")
      ]);
      output.push(part);
      position += part.length;
    }
    output.push(
      Buffer.from(
        `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
          .slice(1)
          .map((value) => `${String(value).padStart(10, "0")} 00000 n \n`)
          .join(
            ""
          )}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${position}\n%%EOF`
      )
    );
    return Buffer.concat(output);
  } catch {
    throw new PhotoDocumentConversionError();
  }
}
