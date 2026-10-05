"use client";

import { useRef, useState } from "react";
import { Check, Copy, FileUp, LoaderCircle, X } from "lucide-react";
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
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled)
          onFiles(
            Array.from(event.dataTransfer.files).slice(
              0,
              multiple ? undefined : 1,
            ),
          );
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
          if (event.target.files) onFiles(Array.from(event.target.files));
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
export function BusyLabel({ busy, idle }: { busy: boolean; idle: string }) {
  return (
    <>
      {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
      {busy ? "Processing locally…" : idle}
    </>
  );
}
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError("");
      setTimeout(() => setCopied(false), 2000);
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
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <input
          aria-label={label}
          className={`input ${suffix ? "pr-12" : ""}`}
          type="number"
          value={Number.isNaN(value) ? "" : value}
          onChange={(event) =>
            onChange(event.target.value === "" ? 0 : Number(event.target.value))
          }
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
