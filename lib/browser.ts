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
export function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3);
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${["B", "KB", "MB", "GB"][i]}`;
}
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Processing failed. Please try another file.";
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
  if (!context) throw new Error("Canvas is unavailable in this browser.");
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
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}
