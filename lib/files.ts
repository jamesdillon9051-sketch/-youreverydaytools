/** A PDF header may be preceded by up to 1,024 bytes of junk (ISO 32000). */
export function isPdf(bytes: Uint8Array) {
  const limit = Math.min(bytes.length - 4, 1024);
  for (let i = 0; i < limit; i++)
    if (
      bytes[i] === 0x25 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x44 &&
      bytes[i + 3] === 0x46 &&
      bytes[i + 4] === 0x2d
    )
      return true;
  return false;
}

export type ImageInfo =
  | {
      format: "jpeg";
      /** EXIF orientation 1–8; anything but 1 needs rotating before use. */
      orientation: number;
      /** Plain 8-bit grayscale/RGB JPEG that PDF viewers can embed as-is. */
      embeddable: boolean;
    }
  | { format: "png" }
  | {
      format: "webp";
      /** Plain lossy WebP: no alpha channel, no animation. */ lossy: boolean;
    };

function exifOrientation(bytes: Uint8Array, tiff: number, end: number) {
  const little = bytes[tiff] === 0x49 && bytes[tiff + 1] === 0x49;
  const big = bytes[tiff] === 0x4d && bytes[tiff + 1] === 0x4d;
  if ((!little && !big) || end > bytes.length) return undefined;
  const u16 = (offset: number) =>
    little
      ? bytes[offset] | (bytes[offset + 1] << 8)
      : (bytes[offset] << 8) | bytes[offset + 1];
  const u32 = (offset: number) =>
    little
      ? bytes[offset] +
        bytes[offset + 1] * 2 ** 8 +
        bytes[offset + 2] * 2 ** 16 +
        bytes[offset + 3] * 2 ** 24
      : bytes[offset] * 2 ** 24 +
        bytes[offset + 1] * 2 ** 16 +
        bytes[offset + 2] * 2 ** 8 +
        bytes[offset + 3];
  if (tiff + 8 > end || u16(tiff + 2) !== 42) return undefined;
  const directory = tiff + u32(tiff + 4);
  if (directory + 2 > end) return undefined;
  const count = u16(directory);
  for (let i = 0; i < count; i++) {
    const entry = directory + 2 + i * 12;
    if (entry + 12 > end) return undefined;
    if (u16(entry) === 0x0112) {
      const value = u16(entry + 8);
      return value >= 1 && value <= 8 ? value : undefined;
    }
  }
  return undefined;
}
function inspectJpeg(bytes: Uint8Array): ImageInfo {
  let orientation = 1;
  let embeddable = false;
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xff) {
      offset++;
      continue;
    }
    // Standalone markers carry no length.
    if (
      marker === 0xd8 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      offset += 2;
      continue;
    }
    // End of image, or start of scan: the entropy-coded data follows.
    if (marker === 0xd9 || marker === 0xda) break;
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2) break;
    const segment = offset + 4;
    if (
      marker === 0xe1 &&
      length >= 8 &&
      bytes[segment] === 0x45 && // "Exif\0\0"
      bytes[segment + 1] === 0x78 &&
      bytes[segment + 2] === 0x69 &&
      bytes[segment + 3] === 0x66 &&
      bytes[segment + 4] === 0 &&
      bytes[segment + 5] === 0
    )
      orientation =
        exifOrientation(bytes, segment + 6, offset + 2 + length) ?? orientation;
    // Baseline, extended sequential and progressive Huffman frames.
    if (marker >= 0xc0 && marker <= 0xc2) {
      const precision = bytes[segment];
      const components = bytes[segment + 5];
      embeddable = precision === 8 && (components === 1 || components === 3);
    }
    offset += 2 + length;
  }
  return { format: "jpeg", orientation, embeddable };
}
/** Identify an image by its bytes rather than by a file name or MIME type. */
export function sniffImage(bytes: Uint8Array): ImageInfo | null {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return inspectJpeg(bytes);
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, i) => bytes[i] === value,
    )
  )
    return { format: "png" };
  if (
    bytes.length >= 16 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  )
    return {
      format: "webp",
      lossy: String.fromCharCode(...bytes.subarray(12, 16)) === "VP8 ",
    };
  return null;
}
