import assert from "node:assert/strict";
import { test } from "node:test";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { isPdf, sniffImage } from "../lib/files";
import { describePdfFailure } from "../lib/pdf";
import {
  errorMessage,
  formatBytes,
  isAbortError,
  sanitizeFilename,
} from "../lib/browser";

const raw = (width: number, height: number, channels: 3 | 4 = 3) => ({
  create: {
    width,
    height,
    channels,
    background: channels === 4 ? "#7c3aed80" : "#7c3aed",
  },
});

test("PDF detection reads the header, tolerating leading junk like Acrobat does", async () => {
  const document = await PDFDocument.create();
  document.addPage([100, 100]);
  const bytes = await document.save();
  assert.ok(isPdf(bytes));
  const prefixed = new Uint8Array(900 + bytes.length);
  prefixed.set(bytes, 900);
  assert.ok(isPdf(prefixed));
  const tooLate = new Uint8Array(2000 + bytes.length);
  tooLate.set(bytes, 2000);
  assert.equal(isPdf(tooLate), false);
  assert.equal(isPdf(new Uint8Array()), false);
  assert.equal(isPdf(new TextEncoder().encode("%PDF")), false);
  assert.equal(isPdf(new TextEncoder().encode("hello, not a pdf")), false);
});

test("JPEG inspection finds EXIF orientation and whether it can be embedded untouched", async () => {
  const plain = await sharp(raw(40, 30)).jpeg().toBuffer();
  assert.deepEqual(sniffImage(plain), {
    format: "jpeg",
    orientation: 1,
    embeddable: true,
  });
  const progressive = await sharp(raw(40, 30))
    .jpeg({ progressive: true })
    .toBuffer();
  assert.deepEqual(sniffImage(progressive), {
    format: "jpeg",
    orientation: 1,
    embeddable: true,
  });
  for (const orientation of [2, 3, 6, 8]) {
    const rotated = await sharp(raw(40, 30))
      .withMetadata({ orientation })
      .jpeg()
      .toBuffer();
    const info = sniffImage(rotated);
    assert.equal(info?.format, "jpeg");
    assert.equal(info?.format === "jpeg" && info.orientation, orientation);
  }
  const grayscale = await sharp(raw(40, 30)).grayscale().jpeg().toBuffer();
  const gray = sniffImage(grayscale);
  assert.equal(gray?.format === "jpeg" && gray.embeddable, true);
  const cmyk = await sharp(raw(40, 30)).toColourspace("cmyk").jpeg().toBuffer();
  const cmykInfo = sniffImage(cmyk);
  assert.equal(cmykInfo?.format === "jpeg" && cmykInfo.embeddable, false);
});

test("JPEG inspection survives truncated and corrupt data", () => {
  assert.deepEqual(sniffImage(Uint8Array.from([0xff, 0xd8, 0xff])), null);
  const truncated = sniffImage(Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0x00]));
  assert.equal(truncated?.format, "jpeg");
  const hostile = new Uint8Array(4096).fill(0xff);
  hostile[0] = 0xff;
  hostile[1] = 0xd8;
  hostile[2] = 0xff;
  assert.equal(sniffImage(hostile)?.format, "jpeg");
  const lengthOverrun = Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 0x45, 0x78, 0x69, 0x66, 0, 0, 0x49,
    0x49, 0x2a, 0, 0xff, 0xff, 0xff, 0xff,
  ]);
  assert.equal(sniffImage(lengthOverrun)?.format, "jpeg");
});

test("PNG and WebP are identified by content; lossy WebP is told apart from lossless and transparent", async () => {
  assert.deepEqual(sniffImage(await sharp(raw(8, 8)).png().toBuffer()), {
    format: "png",
  });
  assert.deepEqual(
    sniffImage(await sharp(raw(8, 8)).webp({ quality: 70 }).toBuffer()),
    { format: "webp", lossy: true },
  );
  assert.deepEqual(
    sniffImage(await sharp(raw(8, 8)).webp({ lossless: true }).toBuffer()),
    { format: "webp", lossy: false },
  );
  assert.deepEqual(
    sniffImage(
      await sharp(raw(8, 8, 4))
        .webp({ quality: 70 })
        .toBuffer(),
    ),
    { format: "webp", lossy: false },
  );
  assert.equal(sniffImage(new TextEncoder().encode("GIF89a......")), null);
  assert.equal(sniffImage(new TextEncoder().encode("<svg></svg>")), null);
  assert.equal(sniffImage(new Uint8Array()), null);
});

test("PDF failures name the file and explain the cause", async () => {
  const encrypted = new Error(
    "Input document to `PDFDocument.load` is encrypted. You can use `PDFDocument.load(..., { ignoreEncryption: true })`.",
  );
  assert.match(
    describePdfFailure(encrypted, "a.pdf"),
    /"a\.pdf" is password-protected/,
  );
  const real = await PDFDocument.load(
    new TextEncoder().encode("not a pdf"),
  ).catch((failure) => failure);
  assert.match(
    describePdfFailure(real, "b.pdf"),
    /"b\.pdf" is not a valid PDF/,
  );
  const memory = new RangeError("Array buffer allocation failed");
  const message = describePdfFailure(memory, "huge.pdf");
  assert.match(message, /"huge\.pdf"/);
  assert.match(message, /memory/);
  assert.doesNotMatch(message, /not a valid PDF/);
  assert.match(
    describePdfFailure(new Error("weird"), "c.pdf"),
    /"c\.pdf": weird/,
  );
});

test("browser helpers format sizes and translate low-level failures", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(1023), "1023 B");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(5 * 1024 ** 2), "5.0 MB");
  assert.equal(formatBytes(3 * 1024 ** 4), "3072.0 GB");
  for (const bad of [-5, NaN, Infinity, 0.4]) {
    const text = formatBytes(bad);
    assert.doesNotMatch(text, /NaN|undefined|Infinity/);
  }
  assert.match(
    errorMessage(new RangeError("Array buffer allocation failed")),
    /memory/,
  );
  assert.match(
    errorMessage(new RangeError("Invalid typed array length: 4e9")),
    /memory/,
  );
  assert.match(
    errorMessage(new RangeError("Maximum call stack size exceeded")),
    /nested too deeply/,
  );
  assert.match(errorMessage(new TypeError("Failed to fetch")), /Network error/);
  assert.match(errorMessage(new TypeError("Load failed")), /Network error/);
  assert.match(
    errorMessage(
      new TypeError("NetworkError when attempting to fetch resource."),
    ),
    /Network error/,
  );
  assert.match(
    errorMessage(new DOMException("gone", "NotFoundError")),
    /could not be read/,
  );
  assert.equal(
    errorMessage(new SyntaxError("Unexpected token } in JSON")),
    "Unexpected token } in JSON",
  );
  assert.equal(
    errorMessage("a string"),
    "Processing failed. Please try another file.",
  );
  assert.equal(isAbortError(new DOMException("x", "AbortError")), true);
  assert.equal(isAbortError(new Error("x")), false);
});

test("user-chosen filenames are made safe and portable", () => {
  assert.equal(sanitizeFilename("report.pdf", "x"), "report.pdf");
  assert.equal(sanitizeFilename("../../etc/passwd", "x"), "etc-passwd");
  assert.equal(sanitizeFilename('a<b>c:d"e|f?g*h', "x"), "a-b-c-d-e-f-g-h");
  assert.equal(sanitizeFilename("  .hidden  ", "x"), "hidden");
  assert.equal(sanitizeFilename("trailing. ", "x"), "trailing");
  assert.equal(
    sanitizeFilename("line\nbreak\u0000.bin", "x"),
    "line-break-.bin",
  );
  assert.equal(sanitizeFilename("", "decoded.bin"), "decoded.bin");
  assert.equal(sanitizeFilename("...", "decoded.bin"), "decoded.bin");
  assert.equal(sanitizeFilename("a".repeat(500), "x").length, 120);
});
