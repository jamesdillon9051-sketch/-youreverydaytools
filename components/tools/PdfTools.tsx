"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Download, GripVertical, X } from "lucide-react";
import {
  canvasBlob,
  createCanvas,
  downloadBlob,
  errorMessage,
  formatBytes,
  loadImage,
} from "@/lib/browser";
import { parsePageRanges } from "@/lib/calculations";
import { BusyLabel, ErrorNotice, FileDropzone, NumberField } from "./Shared";

export default function PdfTools({ mode }: { mode: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [range, setRange] = useState("1");
  const [paper, setPaper] = useState("a4");
  const [margin, setMargin] = useState(24);
  const [perPage, setPerPage] = useState(1);
  const [result, setResult] = useState<{
    blob: Blob;
    name: string;
    pages: number;
  } | null>(null);
  const dragIndex = useRef<number | null>(null);
  const reading = useRef(0);
  const images = mode === "image-to-pdf";
  async function addFiles(incoming: File[]) {
    setError("");
    setResult(null);
    const supported = incoming.filter((file) =>
      images
        ? /image\/(jpeg|png|webp)/.test(file.type) ||
          /\.(jpe?g|png|webp)$/i.test(file.name)
        : file.type === "application/pdf" || /\.pdf$/i.test(file.name),
    );
    if (supported.length !== incoming.length)
      setError(
        images
          ? "Choose JPG, PNG, or WebP images."
          : "Choose PDF documents only.",
      );
    if (mode !== "split-pdf") {
      setFiles((current) => [...current, ...supported]);
      return;
    }
    if (!supported[0]) return;
    const ticket = ++reading.current;
    setBusy(true);
    setPageCount(0);
    setFiles([supported[0]]);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.load(await supported[0].arrayBuffer());
      if (ticket === reading.current) {
        setPageCount(pdf.getPageCount());
        setRange(`1-${pdf.getPageCount()}`);
      }
    } catch (failure) {
      if (ticket === reading.current)
        setError(
          `Could not read PDF: ${errorMessage(failure)}. Encrypted files are unsupported.`,
        );
    } finally {
      if (ticket === reading.current) setBusy(false);
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
  async function process() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const output = await PDFDocument.create();
      if (mode === "merge-pdf") {
        for (const file of files) {
          const document = await PDFDocument.load(await file.arrayBuffer());
          const pages = await output.copyPages(
            document,
            document.getPageIndices(),
          );
          pages.forEach((page) => output.addPage(page));
        }
      } else if (mode === "split-pdf") {
        const source = await PDFDocument.load(await files[0].arrayBuffer());
        const selected = parsePageRanges(range, source.getPageCount());
        const pages = await output.copyPages(source, selected);
        pages.forEach((page) => output.addPage(page));
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
          if (i > 0 && i % perPage === 0)
            page = output.addPage([pageWidth, pageHeight]);
          const image = await loadImage(files[i]);
          const { canvas, context } = createCanvas(
            image.naturalWidth,
            image.naturalHeight,
          );
          context.drawImage(image, 0, 0);
          const png = await canvasBlob(canvas);
          const embedded = await output.embedPng(await png.arrayBuffer());
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
          canvas.width = 0;
          canvas.height = 0;
        }
      }
      output.setTitle(
        mode === "merge-pdf"
          ? "Merged document"
          : mode === "split-pdf"
            ? "Extracted pages"
            : "Images to PDF",
      );
      output.setCreator("LocalTools — browser processing");
      const bytes = await output.save();
      const blob = new Blob([new Uint8Array(bytes)], {
        type: "application/pdf",
      });
      const name =
        mode === "merge-pdf"
          ? "merged.pdf"
          : mode === "split-pdf"
            ? "extracted-pages.pdf"
            : "images.pdf";
      setResult({ blob, name, pages: output.getPageCount() });
      downloadBlob(blob, name);
    } catch (failure) {
      setError(
        `${errorMessage(failure)}${images ? "" : " Password-protected PDFs are unsupported."}`,
      );
    } finally {
      setBusy(false);
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
                    onClick={() => reorder(i, i - 1)}
                    disabled={busy || i === 0}
                    className="p-1 text-slate-500"
                    aria-label={`Move ${file.name} up`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
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
                disabled={busy}
                onClick={() => {
                  setFiles((current) =>
                    current.filter((_, index) => index !== i),
                  );
                  setResult(null);
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
          />
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
      <button
        onClick={() => void process()}
        className="btn"
        disabled={
          busy ||
          files.length < (mode === "merge-pdf" ? 2 : 1) ||
          (mode === "split-pdf" && !pageCount)
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
      <ErrorNotice message={error} />
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
              {result.pages} pages · {formatBytes(result.blob.size)}
            </p>
          </div>
          <button
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
