"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  CircleCheck,
  Copy,
  FileUp,
  LoaderCircle,
  TriangleAlert,
  X,
} from "lucide-react";
import { formatBytes } from "@/lib/browser";

export function FileDropzone({
  accept,
  multiple = true,
  onFiles,
  label = "Drop files here, or click to browse",
  hint = "Your files stay on your device",
  disabled = false,
}: {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) {
          event.dataTransfer.dropEffect = "copy";
          setDragging(true);
        }
      }}
      onDragLeave={(event) => {
        // Moving between child elements also fires dragleave; ignore that.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (disabled) return;
        const dropped = Array.from(event.dataTransfer.files).slice(
          0,
          multiple ? undefined : 1,
        );
        if (dropped.length) onFiles(dropped);
      }}
      className={`rounded-2xl border-2 border-dashed transition ${dragging ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30" : "border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-950/40"}`}
    >
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        aria-label="Choose local files"
        onChange={(event) => {
          if (event.target.files?.length)
            onFiles(Array.from(event.target.files));
          event.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={disabled}
        className="flex w-full flex-col items-center px-4 py-10 text-center"
      >
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-violet-500 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <FileUp className="h-6 w-6" />
        </span>
        <span className="text-sm font-semibold">{label}</span>
        <span className="muted mt-2 text-xs">{hint}</span>
      </button>
    </div>
  );
}
export function FileList({
  files,
  onRemove,
}: {
  files: File[];
  onRemove?: (index: number) => void;
}) {
  return (
    <ul className="mt-4 max-h-64 space-y-2 overflow-auto">
      {files.map((file, i) => (
        <li
          key={`${file.name}-${i}`}
          className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-950"
        >
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <span className="shrink-0 text-slate-400">
            {formatBytes(file.size)}
          </span>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="p-1 text-slate-400 hover:text-rose-500"
              aria-label={`Remove ${file.name}`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
export function ErrorNotice({ message }: { message: string }) {
  return message ? (
    <p
      role="alert"
      className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
    >
      {message}
    </p>
  ) : null;
}
/** Polite, non-interrupting confirmation or guidance (use ErrorNotice for failures). */
export function StatusNotice({
  children,
  tone = "success",
}: {
  children: React.ReactNode;
  tone?: "success" | "warning";
}) {
  const Icon = tone === "success" ? CircleCheck : TriangleAlert;
  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
/** Determinate when `value` (0–100) is given, otherwise an indeterminate pulse. */
export function ProgressBar({
  label,
  value,
  detail,
}: {
  label: string;
  value?: number;
  detail?: string;
}) {
  const percent =
    value === undefined ? undefined : Math.min(100, Math.max(0, value));
  return (
    <div className="space-y-1.5" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
        <span className="min-w-0 truncate">{label}</span>
        {detail && (
          <span className="shrink-0 tabular-nums text-slate-400">{detail}</span>
        )}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent === undefined ? undefined : Math.round(percent)}
        className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
      >
        <div
          className={`h-full rounded-full bg-violet-600 transition-[width] duration-200 ${percent === undefined ? "progress-indeterminate w-1/3" : ""}`}
          style={percent === undefined ? undefined : { width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
export function BusyLabel({
  busy,
  idle,
  busyText = "Processing locally…",
}: {
  busy: boolean;
  idle: string;
  busyText?: string;
}) {
  return (
    <>
      {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
      {busy ? busyText : idle}
    </>
  );
}
async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // Fall through: the async API is missing or blocked (some in-app browsers).
  }
  const active = document.activeElement as HTMLElement | null;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    if (!document.execCommand("copy")) throw new Error("Copy was rejected.");
  } finally {
    area.remove();
    active?.focus();
  }
}
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    try {
      await writeClipboard(text);
      setCopied(true);
      setError("");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(
        "Clipboard access is unavailable. Select and copy the output manually.",
      );
    }
  }
  return (
    <div>
      <button
        type="button"
        className="btn-secondary"
        onClick={copy}
        disabled={!text}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy"}
      </button>
      {error && (
        <p role="status" className="muted mt-2 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = "any",
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | "any";
  suffix?: string;
}) {
  // Keep the raw text so the field can be emptied and retyped; the parent
  // still receives 0 for an empty field.
  const [text, setText] = useState(Number.isFinite(value) ? String(value) : "");
  useEffect(() => {
    setText((current) =>
      Number(current) === value && current !== ""
        ? current
        : current === "" && value === 0
          ? current
          : Number.isFinite(value)
            ? String(value)
            : "",
    );
  }, [value]);
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <input
          aria-label={label}
          className={`input ${suffix ? "pr-12" : ""}`}
          type="number"
          inputMode="decimal"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            onChange(
              event.target.value === "" ? 0 : Number(event.target.value),
            );
          }}
          min={min}
          max={max}
          step={step}
        />
        {suffix && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-3 text-xs text-slate-400"
          >
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}
