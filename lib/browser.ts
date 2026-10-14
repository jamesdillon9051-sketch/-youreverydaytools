export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
/**
 * Wrap bytes in a Blob without copying them. TypeScript only accepts
 * ArrayBuffer-backed views as BlobParts, and every producer used here
 * (pdf-lib, fflate, TextEncoder) returns ArrayBuffer-backed arrays.
 */
export function toBlob(bytes: Uint8Array, type: string): Blob {
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type });
}
export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const i = Math.min(
    Math.max(Math.floor(Math.log(bytes) / Math.log(1024)), 0),
    3,
  );
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${["B", "KB", "MB", "GB"][i]}`;
}
export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
/**
 * Turn the failures browsers actually throw (out of memory, unreadable files,
 * dropped connections) into messages a person can act on. Messages written by
 * this app, and parser messages such as JSON.parse errors, pass through.
 */
export function errorMessage(error: unknown) {
  if (!(error instanceof Error))
    return "Processing failed. Please try another file.";
  if (error instanceof RangeError && /call stack/i.test(error.message))
    return "This data is nested too deeply to process.";
  if (
    error instanceof RangeError &&
    /allocation|array length|out of memory|buffer/i.test(error.message)
  )
    return "This is too large for your browser's available memory. Try a smaller file, or close other tabs and try again.";
  if (error.name === "QuotaExceededError")
    return "Your browser ran out of storage or memory while working. Try smaller files or close other tabs.";
  if (error.name === "NotReadableError" || error.name === "NotFoundError")
    return "This file could not be read. It may have been moved or deleted, or it may still be syncing from cloud storage.";
  if (
    error instanceof TypeError &&
    /failed to fetch|networkerror|load failed|network request failed/i.test(
      error.message,
    )
  )
    return "Network error. Check your connection and try again.";
  return error.message || "Processing failed. Please try another file.";
}
/** Keep a user-chosen name safe and portable across operating systems. */
export function sanitizeFilename(name: string, fallback: string) {
  const cleaned = name
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.\s-]+|[.\s]+$/g, "")
    .slice(0, 120);
  return cleaned || fallback;
}
export function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "This image could not be read. Use a supported JPG, PNG, or WebP file.",
        ),
      );
    };
    image.src = url;
  });
}
export function canvasBlob(
  canvas: HTMLCanvasElement,
  type = "image/png",
  quality = 0.85,
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(
              new Error(
                "The browser could not export this image. Try smaller dimensions.",
              ),
            ),
      type,
      quality,
    ),
  );
}
export function createCanvas(width: number, height: number) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 1 ||
    height < 1 ||
    width > 16384 ||
    height > 16384 ||
    width * height > 40_000_000
  )
    throw new Error(
      "Use dimensions up to 16,384 pixels per side and 40 megapixels total.",
    );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error(
      "Canvas is unavailable in this browser, or the image is too large for its memory limit.",
    );
  // Downscaling with the default (low) smoothing produces visible aliasing.
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  return { canvas, context };
}
export function bytesToBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += 32768)
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + 32768)));
  return btoa(chunks.join(""));
}
export function base64ToBytes(input: string): Uint8Array<ArrayBuffer> {
  let text = input
    .trim()
    .replace(/^data:[^,]*;base64,/i, "")
    .replace(/\s/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  if (
    !/^[A-Za-z0-9+/]*={0,2}$/.test(text) ||
    text.length % 4 === 1 ||
    (text.includes("=") && text.length % 4 !== 0)
  )
    throw new Error("Invalid Base64. Check the characters and padding.");
  if (!text.includes("="))
    text = text.padEnd(Math.ceil(text.length / 4) * 4, "=");
  const decoded = atob(text);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
  return bytes;
}
