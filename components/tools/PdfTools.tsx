"use client";

import { useRef, useState } from "react";
import type { PDFDocument, PDFImage } from "pdf-lib";
import { ArrowDown, ArrowUp, Download, GripVertical, X } from "lucide-react";
import {
  canvasBlob,
  createCanvas,
  downloadBlob,
  errorMessage,
  formatBytes,
  loadImage,
  toBlob,
} from "@/lib/browser";
import { parsePageRanges } from "@/lib/calculations";
import { isPdf, sniffImage } from "@/lib/files";
import { describePdfFailure } from "@/lib/pdf";
import {
  BusyLabel,
  ErrorNotice,
  FileDropzone,
  NumberField,
  ProgressBar,
  StatusNotice,
} from "./Shared";

class CanceledError extends Error {}
const LARGE_TOTAL = 250 * 1024 * 1024;

/**
 * Embed an image with the least recompression that stays correct. JPEGs go in
 * untouched (no decoding, so even 100-megapixel photos work); everything that
 * needs normalizing is drawn on a canvas and re-encoded as JPEG when the
 * source is lossy, or PNG when it must stay lossless or transparent.
 */
async function embedImage(output: PDFDocument, file: File): Promise<PDFImage> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const info = sniffImage(bytes);
  if (!info) throw new Error("This is not a JPG, PNG, or WebP image.");
  if (info.format === "jpeg" && info.embeddable && info.orientation === 1) {
    try {
      return await output.embedJpg(bytes);
    } catch {
      // Unusual JPEG variant: decode it with the browser instead.
    }
  }
  if (info.format === "png") {
    try {
      return await output.embedPng(bytes);
    } catch {
      // 16-bit, interlaced, or otherwise unusual PNG: let the browser decode it.
    }
  }
  const lossy =
    info.format === "jpeg" || (info.format === "webp" && info.lossy);
  const image = await loadImage(file);
  const { canvas, context } = createCanvas(
    image.naturalWidth,
    image.naturalHeight,
  );
  try {
    if (lossy) {
      // JPEG has no alpha channel; paint white so transparency is not black.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0);
    const blob = await canvasBlob(
      canvas,
      lossy ? "image/jpeg" : "image/png",
      0.92,
    );
    const encoded = new Uint8Array(await blob.arrayBuffer());
    return lossy
      ? await output.embedJpg(encoded)
      : await output.embedPng(encoded);
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
function nameList(names: string[]) {
  const shown = names.slice(0, 3).join(", ");
  return names.length > 3 ? `${shown} and ${names.length - 3} more` : shown;
}

export default function PdfTools({ mode }: { mode: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [range, setRange] = useState("1");
  const [paper, setPaper] = useState("a4");
  const [margin, setMargin] = useState(24);
  const [perPage, setPerPage] = useState(1);
  const [progress, setProgress] = useState<{
    label: string;
    value?: number;
  } | null>(null);
  const [result, setResult] = useState<{
    blob: Blob;
    name: string;
    pages: number;
  } | null>(null);
  const dragIndex = useRef<number | null>(null);
  const reading = useRef(0);
  const canceled = useRef(false);
  const images = mode === "image-to-pdf";
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  let rangeError = "";
  if (mode === "split-pdf" && pageCount) {
    try {
      parsePageRanges(range, pageCount);
    } catch (failure) {
      rangeError = errorMessage(failure);
    }
  }
  async function addFiles(incoming: File[]) {
    setError("");
    setNotice("");
    setResult(null);
    const rejected: string[] = [];
    const unreadable: string[] = [];
    const supported: File[] = [];
    for (const file of incoming) {
      const named = images
        ? /image\/(jpeg|png|webp)/.test(file.type) ||
          /\.(jpe?g|png|webp)$/i.test(file.name)
        : file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      if (!named) {
        rejected.push(file.name);
        continue;
      }
      // Trust the file's bytes, not its extension.
      try {
        const head = new Uint8Array(
          await file.slice(0, images ? 32 : 1032).arrayBuffer(),
        );
        if (images ? sniffImage(head) : isPdf(head)) supported.push(file);
        else rejected.push(file.name);
      } catch {
        unreadable.push(file.name);
      }
    }
    if (rejected.length || unreadable.length)
      setError(
        [
          rejected.length &&
            `${images ? "Choose JPG, PNG, or WebP images." : "Choose PDF documents only."} Skipped: ${nameList(rejected)}.`,
          unreadable.length &&
            `Could not read ${nameList(unreadable)}. The file may have been moved or may still be syncing from cloud storage.`,
        ]
          .filter(Boolean)
          .join(" "),
      );
    if (mode !== "split-pdf") {
      setFiles((current) => [...current, ...supported]);
      return;
    }
    const file = supported[0];
    if (!file) return;
    const ticket = ++reading.current;
    setBusy(true);
    setPageCount(0);
    setFiles([file]);
    setProgress({ label: `Reading ${file.name}…` });
    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.load(await file.arrayBuffer(), {
        updateMetadata: false,
      });
      if (ticket !== reading.current) return;
      const count = pdf.getPageCount();
      if (!count) throw new Error("This PDF has no pages.");
      setPageCount(count);
      setRange(`1-${count}`);
    } catch (failure) {
      if (ticket === reading.current)
        setError(describePdfFailure(failure, file.name));
    } finally {
      if (ticket === reading.current) {
        setBusy(false);
        setProgress(null);
      }
    }
  }
  function reorder(from: number, to: number) {
    if (busy || from === to || to < 0 || to >= files.length) return;
    setFiles((current) => {
      const next = [...current];
      const [file] = next.splice(from, 1);
      next.splice(to, 0, file);
      return next;
    });
    setResult(null);
  }
  function advance(done: number, total: number, action: string) {
    if (canceled.current) throw new CanceledError();
    setProgress({
      label: `${action} (${done + 1} of ${total})`,
      value: (done / total) * 100,
    });
  }
  async function process() {
    canceled.current = false;
    setBusy(true);
    setProcessing(true);
    setError("");
    setNotice("");
    setResult(null);
    setProgress({ label: "Preparing…" });
    try {
      const { PDFDocument } = await import("pdf-lib");
      const output = await PDFDocument.create();
      // Problems inside a document are reported with the file's name.
      const loadPdf = async (file: File) => {
        try {
          return await PDFDocument.load(await file.arrayBuffer(), {
            updateMetadata: false,
          });
        } catch (failure) {
          throw new Error(describePdfFailure(failure, file.name));
        }
      };
      const copyPages = async (
        source: PDFDocument,
        file: File,
        pages: number[],
      ) => {
        try {
          for (const page of await output.copyPages(source, pages))
            output.addPage(page);
        } catch (failure) {
          throw new Error(describePdfFailure(failure, file.name));
        }
      };
      if (mode === "merge-pdf") {
        for (let i = 0; i < files.length; i++) {
          advance(i, files.length, `Merging ${files[i].name}`);
          const document = await loadPdf(files[i]);
          await copyPages(document, files[i], document.getPageIndices());
        }
      } else if (mode === "split-pdf") {
        setProgress({ label: `Extracting pages from ${files[0].name}…` });
        const source = await loadPdf(files[0]);
        await copyPages(
          source,
          files[0],
          parsePageRanges(range, source.getPageCount()),
        );
      } else {
        const [pageWidth, pageHeight] =
          paper === "a4" ? [595.28, 841.89] : [612, 792];
        if (!Number.isFinite(margin) || margin < 0 || margin > 140)
          throw new Error("Choose a page margin between 0 and 140 points.");
        const columns = perPage === 4 ? 2 : 1;
        const rows = perPage === 1 ? 1 : 2;
        const gap = 12;
        const cellWidth =
          (pageWidth - 2 * margin - (columns - 1) * gap) / columns;
        const cellHeight = (pageHeight - 2 * margin - (rows - 1) * gap) / rows;
        let page = output.addPage([pageWidth, pageHeight]);
        for (let i = 0; i < files.length; i++) {
          advance(i, files.length, `Adding ${files[i].name}`);
          if (i > 0 && i % perPage === 0)
            page = output.addPage([pageWidth, pageHeight]);
          let embedded: PDFImage;
          try {
            embedded = await embedImage(output, files[i]);
          } catch (failure) {
            throw new Error(`"${files[i].name}": ${errorMessage(failure)}`);
          }
          const scale = Math.min(
            cellWidth / embedded.width,
            cellHeight / embedded.height,
          );
          const w = embedded.width * scale,
            h = embedded.height * scale;
          const cell = i % perPage;
          const column = cell % columns,
            row = Math.floor(cell / columns);
          page.drawImage(embedded, {
            x: margin + column * (cellWidth + gap) + (cellWidth - w) / 2,
            y:
              pageHeight -
              margin -
              row * (cellHeight + gap) -
              cellHeight +
              (cellHeight - h) / 2,
            width: w,
            height: h,
          });
        }
      }
      if (canceled.current) throw new CanceledError();
      if (!output.getPageCount())
        throw new Error("The selected files contain no pages to export.");
      setProgress({ label: "Finalizing your PDF…" });
      // Let the browser paint the status before the CPU-heavy save.
      await new Promise((resolve) => setTimeout(resolve, 0));
      output.setTitle(
        mode === "merge-pdf"
          ? "Merged document"
          : mode === "split-pdf"
            ? "Extracted pages"
            : "Images to PDF",
      );
      output.setCreator("LocalTools — browser processing");
      const blob = toBlob(await output.save(), "application/pdf");
      const name =
        mode === "merge-pdf"
          ? "merged.pdf"
          : mode === "split-pdf"
            ? "extracted-pages.pdf"
            : "images.pdf";
      setResult({ blob, name, pages: output.getPageCount() });
      downloadBlob(blob, name);
    } catch (failure) {
      if (failure instanceof CanceledError)
        setNotice("Canceled. No file was created.");
      else setError(errorMessage(failure));
    } finally {
      setBusy(false);
      setProcessing(false);
      setProgress(null);
    }
  }
  return (
    <div className="space-y-5">
      <FileDropzone
        accept={images ? "image/jpeg,image/png,image/webp" : "application/pdf"}
        multiple={mode !== "split-pdf"}
        onFiles={(incoming) => void addFiles(incoming)}
        disabled={busy}
        hint={
          images
            ? "JPG, PNG, WebP · Reorder images below"
            : "PDF documents · No uploads or accounts"
        }
      />
      {files.length > 0 && (
        <ol className="max-h-80 space-y-2 overflow-auto">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              draggable={!busy && mode !== "split-pdf"}
              onDragStart={() => {
                dragIndex.current = i;
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex.current !== null) reorder(dragIndex.current, i);
                dragIndex.current = null;
              }}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"
            >
              <GripVertical className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="mr-1 text-[10px] text-slate-400">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{file.name}</p>
                <span className="text-[10px] text-slate-400">
                  {formatBytes(file.size)}
                </span>
              </div>
              {mode !== "split-pdf" && (
                <>
                  <button
                    type="button"
                    onClick={() => reorder(i, i - 1)}
                    disabled={busy || i === 0}
                    className="p-1 text-slate-500"
                    aria-label={`Move ${file.name} up`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => reorder(i, i + 1)}
                    disabled={busy || i === files.length - 1}
                    className="p-1 text-slate-500"
                    aria-label={`Move ${file.name} down`}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setFiles((current) =>
                    current.filter((_, index) => index !== i),
                  );
                  setResult(null);
                  setError("");
                  if (mode === "split-pdf") setPageCount(0);
                }}
                className="p-1 text-slate-400 hover:text-rose-500"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
      )}
      {totalSize > LARGE_TOTAL && (
        <StatusNotice tone="warning">
          These files total {formatBytes(totalSize)}. Very large documents can
          exceed your browser&rsquo;s memory; if processing fails, work in
          smaller batches.
        </StatusNotice>
      )}
      {mode === "split-pdf" && (
        <label className="block">
          <span className="label">
            Page ranges{" "}
            {pageCount > 0 && (
              <span className="text-slate-400">· {pageCount} total pages</span>
            )}
          </span>
          <input
            className="input"
            value={range}
            onChange={(event) => {
              setRange(event.target.value);
              setResult(null);
            }}
            placeholder="1-3, 5"
            disabled={busy}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!rangeError}
          />
          {rangeError && (
            <span
              className="mt-2 block text-xs text-rose-600 dark:text-rose-400"
              aria-live="polite"
            >
              {rangeError}
            </span>
          )}
          <span className="muted mt-2 block text-xs">
            Separate ranges with commas. Pages are extracted in your entered
            order.
          </span>
        </label>
      )}
      {images && (
        <div className="grid gap-4 sm:grid-cols-3">
          <label>
            <span className="label">Page size</span>
            <select
              className="input"
              value={paper}
              onChange={(event) => setPaper(event.target.value)}
              disabled={busy}
            >
              <option value="a4">A4 · portrait</option>
              <option value="letter">US Letter · portrait</option>
            </select>
          </label>
          <NumberField
            label="Page margin"
            value={margin}
            onChange={setMargin}
            max={140}
            suffix="pt"
          />
          <label>
            <span className="label">Images per page</span>
            <select
              className="input"
              value={perPage}
              onChange={(event) => setPerPage(Number(event.target.value))}
              disabled={busy}
            >
              <option value={1}>1 image</option>
              <option value={2}>2 images</option>
              <option value={4}>4 images</option>
            </select>
          </label>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void process()}
          className="btn"
          disabled={
            busy ||
            files.length < (mode === "merge-pdf" ? 2 : 1) ||
            (mode === "split-pdf" && (!pageCount || !!rangeError))
          }
        >
          <BusyLabel
            busy={busy}
            idle={
              mode === "merge-pdf"
                ? "Merge PDFs"
                : mode === "split-pdf"
                  ? "Extract & download pages"
                  : "Create PDF"
            }
          />
        </button>
        {processing && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              canceled.current = true;
            }}
          >
            <X className="h-4 w-4" /> Cancel
          </button>
        )}
      </div>
      {progress && (
        <ProgressBar label={progress.label} value={progress.value} />
      )}
      <ErrorNotice message={error} />
      {notice && <StatusNotice tone="warning">{notice}</StatusNotice>}
      {result && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20"
        >
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              Your PDF is ready
            </p>
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
              {result.pages} {result.pages === 1 ? "page" : "pages"} ·{" "}
              {formatBytes(result.blob.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => downloadBlob(result.blob, result.name)}
            className="btn-secondary"
          >
            <Download className="h-4 w-4" /> Download again
          </button>
        </div>
      )}
    </div>
  );
}
