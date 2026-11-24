import { crc32, deflateSync } from "node:zlib";

export function syntheticPngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]),
    checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}
export function syntheticDocumentPng(
  options: Readonly<{
    width?: number;
    height?: number;
    color?: number;
    filter?: number;
    bitDepth?: number;
    interlace?: number;
    pixels?: Buffer;
    transparency?: Buffer;
  }> = {}
): Buffer {
  const width = options.width ?? 3,
    height = options.height ?? 2,
    color = options.color ?? 2,
    filter = options.filter ?? 0;
  const channels = color === 0 || color === 3 ? 1 : color === 2 ? 3 : color === 4 ? 2 : 4;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = options.bitDepth ?? 8;
  header[9] = color;
  header[12] = options.interlace ?? 0;
  const pixels =
    options.pixels ??
    Buffer.from(
      Array.from({ length: width * height * channels }, (_, i) =>
        color === 3 ? i % 2 : (i * 47) % 256
      )
    );
  const stride = width * channels,
    raw = Buffer.alloc((stride + 1) * height);
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c,
      x = Math.abs(p - a),
      y = Math.abs(p - b),
      z = Math.abs(p - c);
    return x <= y && x <= z ? a : y <= z ? b : c;
  };
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = filter;
    for (let x = 0; x < stride; x++) {
      const at = y * stride + x,
        a = x < channels ? 0 : pixels[at - channels]!,
        b = y ? pixels[at - stride]! : 0,
        c = y && x >= channels ? pixels[at - stride - channels]! : 0;
      const prediction =
        filter === 1
          ? a
          : filter === 2
            ? b
            : filter === 3
              ? Math.floor((a + b) / 2)
              : filter === 4
                ? paeth(a, b, c)
                : 0;
      raw[y * (stride + 1) + x + 1] = (pixels[at]! - prediction) & 255;
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    syntheticPngChunk("IHDR", header),
    ...(color === 3 ? [syntheticPngChunk("PLTE", Buffer.from([255, 0, 0, 0, 255, 0]))] : []),
    ...(options.transparency ? [syntheticPngChunk("tRNS", options.transparency)] : []),
    syntheticPngChunk("IDAT", deflateSync(raw)),
    syntheticPngChunk("IEND", Buffer.alloc(0))
  ]);
}

export const syntheticPhotoTranscript = [
  "Convenção inteiramente fictícia para ensaio local.",
  ...Array.from(
    { length: 24 },
    (_, i) =>
      `Cláusula fictícia ${i + 1}: a utilização do espaço comum exige registro na administração. Linha sintética completa e verificável.`
  ),
  "Fim da página sintética: referência final preservada."
].join("\n");
