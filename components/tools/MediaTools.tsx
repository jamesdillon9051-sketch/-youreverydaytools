"use client";

import { useEffect, useRef, useState } from "react";
import { Download, LoaderCircle, Lock, Unlock, X } from "lucide-react";
import {
  canvasBlob,
  createCanvas,
  downloadBlob,
  errorMessage,
  formatBytes,
  loadImage,
  toBlob,
} from "@/lib/browser";
import { sniffImage } from "@/lib/files";
import {
  BusyLabel,
  ErrorNotice,
  FileDropzone,
  FileList,
  NumberField,
  ProgressBar,
  StatusNotice,
} from "./Shared";

type Result = {
  name: string;
  blob: Blob;
  before: number;
  width: number;
  height: number;
  url: string;
};
const formatNames: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
};
export default function MediaTools({ mode }: { mode: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState(
    mode === "webp-to-jpg" ? "image/jpeg" : "image/webp",
  );
  const [quality, setQuality] = useState(82);
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [locked, setLocked] = useState(true);
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState("");
  const [progress, setProgress] = useState<{
    label: string;
    value: number;
  } | null>(null);
  const urls = useRef<string[]>([]);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
      urls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );
  async function addFiles(incoming: File[]) {
    const supported: File[] = [];
    const rejected: string[] = [];
    for (const file of incoming) {
      const named =
        /image\/(jpeg|png|webp)/.test(file.type) ||
        /\.(jpe?g|png|webp)$/i.test(file.name);
      // Trust the file's bytes, not its extension.
      let valid = false;
      if (named) {
        try {
          valid = !!sniffImage(
            new Uint8Array(await file.slice(0, 32).arrayBuffer()),
          );
        } catch {
          valid = false;
        }
      }
      if (valid) supported.push(file);
      else rejected.push(file.name);
    }
    setError(
      rejected.length
        ? `Only JPG, PNG, and WebP images are supported. Skipped: ${rejected.slice(0, 3).join(", ")}${rejected.length > 3 ? ` and ${rejected.length - 3} more` : ""}.`
        : "",
    );
    setFiles((current) => [...current, ...supported]);
  }
  function cancel() {
    generation.current++;
    setBusy(false);
    setProgress(null);
    setNotice("Canceled. No images were changed.");
  }
  async function process(q = quality) {
    const id = ++generation.current;
    setBusy(true);
    setError("");
    setNotice("");
    setWarning("");
    const next: Result[] = [];
    const failures: { name: string; reason: string }[] = [];
    let substituted = false;
    try {
      if (
        mode === "image-resizer" &&
        (!Number.isFinite(width) ||
          !Number.isFinite(height) ||
          width < 1 ||
          height < 1)
      )
        throw new Error("Enter positive width and height values.");
      for (let i = 0; i < files.length; i++) {
        if (id !== generation.current) return;
        const file = files[i];
        setProgress({
          label: `Processing ${file.name} (${i + 1} of ${files.length})`,
          value: (i / files.length) * 100,
        });
        // Let the browser paint the progress before the heavy decode.
        await new Promise((resolve) => setTimeout(resolve, 0));
        try {
          const image = await loadImage(file);
          let w = image.naturalWidth,
            h = image.naturalHeight;
          if (mode === "image-resizer") {
            const scale = Math.min(width / w, height / h);
            w = locked ? Math.max(1, Math.round(w * scale)) : Math.round(width);
            h = locked
              ? Math.max(1, Math.round(h * scale))
              : Math.round(height);
          }
          const { canvas, context } = createCanvas(w, h);
          let blob: Blob;
          try {
            if (format === "image/jpeg") {
              context.fillStyle = "#ffffff";
              context.fillRect(0, 0, w, h);
            }
            context.drawImage(image, 0, 0, w, h);
            if (mode === "image-compressor" && format !== "image/png") {
              const { default: imageCompression } =
                await import("browser-image-compression");
              const rendered = await canvasBlob(canvas, "image/png");
              blob = await imageCompression(
                new File([rendered], "source.png", { type: "image/png" }),
                {
                  initialQuality: q / 100,
                  fileType: format,
                  maxIteration: 1,
                  useWebWorker: false,
                  alwaysKeepResolution: true,
                },
              );
            } else blob = await canvasBlob(canvas, format, q / 100);
          } finally {
            canvas.width = 0;
            canvas.height = 0;
          }
          if (id !== generation.current) return;
          if (
            mode === "image-compressor" &&
            format === "image/png" &&
            file.type === "image/png" &&
            blob.size >= file.size
          )
            blob = file;
          else if (blob.type !== format) substituted = true;
          const actualExtension =
            blob.type === "image/jpeg"
              ? "jpg"
              : blob.type === "image/webp"
                ? "webp"
                : "png";
          next.push({
            name: `${file.name.replace(/\.[^.]+$/, "")}-${i + 1}.${actualExtension}`,
            blob,
            before: file.size,
            width: w,
            height: h,
            url: "",
          });
        } catch (failure) {
          failures.push({ name: file.name, reason: errorMessage(failure) });
        }
      }
      if (id !== generation.current) return;
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      for (const result of next) result.url = URL.createObjectURL(result.blob);
      urls.current = next.map((result) => result.url);
      setResults(next);
      if (failures.length)
        setError(
          `${failures.length} of ${files.length} ${files.length === 1 ? "file" : "files"} could not be processed. ${failures
            .slice(0, 3)
            .map(
              ({ name, reason }) =>
                `${name}: ${/[.!?]$/.test(reason) ? reason : `${reason}.`}`,
            )
            .join(
              " ",
            )}${failures.length > 3 ? ` ${failures.length - 3} more failed.` : ""}`,
        );
      if (next.length) {
        const before = next.reduce((sum, result) => sum + result.before, 0);
        const after = next.reduce((sum, result) => sum + result.blob.size, 0);
        setNotice(
          `Processed ${next.length} ${next.length === 1 ? "image" : "images"}: ${formatBytes(before)} → ${formatBytes(after)}.`,
        );
      }
      if (substituted)
        setWarning(
          `Your browser cannot save ${formatNames[format] ?? "that format"}, so those images were saved as PNG instead.`,
        );
    } catch (failure) {
      if (id === generation.current) setError(errorMessage(failure));
    } finally {
      if (id === generation.current) {
        setBusy(false);
        setProgress(null);
      }
    }
  }
  async function downloadAll() {
    setZipping(true);
    setError("");
    try {
      const { zip } = await import("fflate");
      const entries: Record<string, Uint8Array> = {};
      for (const result of results)
        entries[result.name] = new Uint8Array(await result.blob.arrayBuffer());
      const bytes = await new Promise<Uint8Array>((resolve, reject) =>
        zip(entries, { level: 0 }, (failure, data) =>
          failure ? reject(failure) : resolve(data),
        ),
      );
      downloadBlob(toBlob(bytes, "application/zip"), "localtools-images.zip");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setZipping(false);
    }
  }
  return (
    <div className="space-y-5">
      <FileDropzone
        accept="image/webp,image/jpeg,image/png"
        onFiles={(incoming) => void addFiles(incoming)}
        disabled={busy}
        hint="JPG, PNG, WebP · Batch processing supported"
      />
      <FileList
        files={files}
        onRemove={
          busy
            ? undefined
            : (index) =>
                setFiles((current) => current.filter((_, i) => i !== index))
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="label">Output format</span>
          <select
            className="input"
            value={format}
            onChange={(event) => setFormat(event.target.value)}
            disabled={busy}
          >
            <option value="image/jpeg">JPG · white background</option>
            <option value="image/png">PNG · transparent, lossless</option>
            {mode !== "webp-to-jpg" && (
              <option value="image/webp">WebP · compact</option>
            )}
          </select>
        </label>
        <label>
          <span className="label">
            Quality{" "}
            <span className="float-right text-violet-500">
              {format === "image/png" ? "Lossless" : `${quality}%`}
            </span>
          </span>
          <input
            type="range"
            className="mt-3 w-full"
            min="0"
            max="100"
            value={quality}
            disabled={busy || format === "image/png"}
            onChange={(event) => setQuality(Number(event.target.value))}
            onPointerUp={(event) => {
              if (mode === "image-compressor" && results.length && !busy)
                void process(Number(event.currentTarget.value));
            }}
            onKeyUp={(event) => {
              if (
                mode === "image-compressor" &&
                results.length &&
                !busy &&
                ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                void process(Number(event.currentTarget.value));
            }}
          />
        </label>
      </div>
      {mode === "image-compressor" && (
        <p className="muted text-xs">
          PNG preserves decoded pixels; re-encoding may not reduce size. JPG and
          WebP quality changes update processed results when you release the
          slider. Metadata is removed.
        </p>
      )}
      {mode === "image-resizer" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Width"
              value={width}
              onChange={setWidth}
              min={1}
              max={16384}
              step={1}
              suffix="px"
            />
            <NumberField
              label="Height"
              value={height}
              onChange={setHeight}
              min={1}
              max={16384}
              step={1}
              suffix="px"
            />
          </div>
          <button
            type="button"
            onClick={() => setLocked(!locked)}
            className="btn-secondary"
            aria-pressed={locked}
          >
            {locked ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Unlock className="h-4 w-4" />
            )}
            {locked
              ? "Aspect ratio locked · fit inside bounds"
              : "Aspect ratio unlocked · stretch to fit"}
          </button>
        </>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void process()}
          disabled={!files.length || busy}
          className="btn"
        >
          <BusyLabel
            busy={busy}
            idle={
              mode === "image-resizer"
                ? "Resize images"
                : mode === "image-compressor"
                  ? "Compress images"
                  : "Convert images"
            }
          />
        </button>
        {busy && (
          <button type="button" className="btn-secondary" onClick={cancel}>
            <X className="h-4 w-4" /> Cancel
          </button>
        )}
        {results.length > 0 && (
          <button
            type="button"
            onClick={() => void downloadAll()}
            className="btn-secondary"
            disabled={busy || zipping}
          >
            {zipping ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}{" "}
            Download ZIP
          </button>
        )}
      </div>
      {progress && (
        <ProgressBar label={progress.label} value={progress.value} />
      )}
      <ErrorNotice message={error} />
      {notice && <StatusNotice>{notice}</StatusNotice>}
      {warning && <StatusNotice tone="warning">{warning}</StatusNotice>}
      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Processed images</h2>
          {results.map((result) => (
            <div
              key={result.name}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
            >
              <img
                src={result.url}
                alt={`Processed ${result.name}`}
                width={56}
                height={56}
                className="h-14 w-14 rounded-lg bg-slate-100 object-contain dark:bg-slate-800"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{result.name}</p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {result.width} × {result.height} ·{" "}
                  {formatBytes(result.before)} → {formatBytes(result.blob.size)}
                </p>
                <p
                  className={`mt-1 text-[10px] ${result.blob.size <= result.before ? "text-emerald-600" : "text-amber-600"}`}
                >
                  {result.before
                    ? `${Math.abs((1 - result.blob.size / result.before) * 100).toFixed(1)}% ${result.blob.size <= result.before ? "smaller" : "larger"}`
                    : "New file"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadBlob(result.blob, result.name)}
                className="btn-secondary"
                aria-label={`Download ${result.name}`}
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
