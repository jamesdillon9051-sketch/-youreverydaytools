"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Lock, Unlock } from "lucide-react";
import {
  canvasBlob,
  createCanvas,
  downloadBlob,
  errorMessage,
  formatBytes,
  loadImage,
} from "@/lib/browser";
import {
  BusyLabel,
  ErrorNotice,
  FileDropzone,
  FileList,
  NumberField,
} from "./Shared";

type Result = {
  name: string;
  blob: Blob;
  before: number;
  width: number;
  height: number;
  url: string;
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
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const urls = useRef<string[]>([]);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
      urls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );
  function addFiles(incoming: File[]) {
    const supported = incoming.filter(
      (file) =>
        /image\/(jpeg|png|webp)/.test(file.type) ||
        /\.(jpe?g|png|webp)$/i.test(file.name),
    );
    setError(
      supported.length !== incoming.length
        ? "Only JPG, PNG, and WebP images are supported."
        : "",
    );
    setFiles((current) => [...current, ...supported]);
  }
  async function process(q = quality) {
    const id = ++generation.current;
    setBusy(true);
    setError("");
    const next: Result[] = [];
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
        setProgress(`Image ${i + 1} of ${files.length}`);
        const file = files[i];
        const image = await loadImage(file);
        let w = image.naturalWidth,
          h = image.naturalHeight;
        if (mode === "image-resizer") {
          const scale = Math.min(width / w, height / h);
          w = locked ? Math.max(1, Math.round(w * scale)) : Math.round(width);
          h = locked ? Math.max(1, Math.round(h * scale)) : Math.round(height);
        }
        const { canvas, context } = createCanvas(w, h);
        if (format === "image/jpeg") {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, w, h);
        }
        context.drawImage(image, 0, 0, w, h);
        let blob: Blob;
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
        if (
          mode === "image-compressor" &&
          format === "image/png" &&
          file.type === "image/png" &&
          blob.size >= file.size
        )
          blob = file;
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
        canvas.width = 0;
        canvas.height = 0;
      }
      if (id !== generation.current) return;
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      for (const result of next) result.url = URL.createObjectURL(result.blob);
      urls.current = next.map((result) => result.url);
      setResults(next);
    } catch (failure) {
      if (id === generation.current) setError(errorMessage(failure));
    } finally {
      if (id === generation.current) {
        setBusy(false);
        setProgress("");
      }
    }
  }
  async function downloadAll() {
    try {
      const { zipSync } = await import("fflate");
      const entries: Record<string, Uint8Array> = {};
      for (const result of results)
        entries[result.name] = new Uint8Array(await result.blob.arrayBuffer());
      const zip = zipSync(entries, { level: 0 });
      downloadBlob(
        new Blob([new Uint8Array(zip)], { type: "application/zip" }),
        "localtools-images.zip",
      );
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }
  return (
    <div className="space-y-5">
      <FileDropzone
        accept="image/webp,image/jpeg,image/png"
        onFiles={addFiles}
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
        {results.length > 0 && (
          <button
            onClick={() => void downloadAll()}
            className="btn-secondary"
            disabled={busy}
          >
            <Download className="h-4 w-4" /> Download ZIP
          </button>
        )}
        <span className="muted text-xs" role="status">
          {progress}
        </span>
      </div>
      <ErrorNotice message={error} />
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
