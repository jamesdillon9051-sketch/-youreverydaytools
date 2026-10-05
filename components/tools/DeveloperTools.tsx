"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Download, FileJson } from "lucide-react";
import {
  base64ToBytes,
  bytesToBase64,
  downloadBlob,
  errorMessage,
} from "@/lib/browser";
import { CopyButton, ErrorNotice, FileDropzone } from "./Shared";

type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
function JsonTree({
  value,
  name = "root",
  depth = 0,
}: {
  value: JsonValue;
  name?: string;
  depth?: number;
}) {
  if (typeof value !== "object" || value === null)
    return (
      <div className="py-1 font-mono text-xs">
        <span className="text-violet-500">{name}</span>:{" "}
        <span
          className={
            typeof value === "string"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-amber-600 dark:text-amber-400"
          }
        >
          {JSON.stringify(value)}
        </span>
      </div>
    );
  const entries = Object.entries(value);
  if (depth >= 30)
    return (
      <p className="muted text-xs">
        {name}: Deeply nested value — use the formatted view to inspect.
      </p>
    );
  return (
    <details open={depth < 2} className="font-mono text-xs">
      <summary className="py-1 text-slate-500 dark:text-slate-400">
        <span className="text-violet-500">{name}</span>{" "}
        {Array.isArray(value)
          ? `[${entries.length} items]`
          : `{${entries.length} keys}`}
      </summary>
      <div className="ml-3 border-l border-slate-200 pl-3 dark:border-slate-700">
        {entries.slice(0, 200).map(([key, item]) => (
          <JsonTree key={key} value={item} name={key} depth={depth + 1} />
        ))}
        {entries.length > 200 && (
          <p className="muted py-2 text-xs">
            Showing the first 200 entries. All entries remain in the formatted
            output.
          </p>
        )}
      </div>
    </details>
  );
}
function HighlightJson({ value }: { value: string }) {
  const expression =
    /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/g;
  const tokens: React.ReactNode[] = [];
  let end = 0;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(value)) !== null) {
    if (match.index > end) tokens.push(value.slice(end, match.index));
    tokens.push(
      <span
        key={match.index}
        className={
          match[1]
            ? "text-violet-600 dark:text-violet-400"
            : match[2]
              ? "text-emerald-600 dark:text-emerald-400"
              : match[3]
                ? "text-rose-500"
                : "text-amber-600 dark:text-amber-400"
        }
      >
        {match[0]}
      </span>,
    );
    end = match.index + match[0].length;
  }
  tokens.push(value.slice(end));
  return <>{tokens}</>;
}
function JsonFormatter() {
  const [input, setInput] = useState(
    '{\n  "hello": "world",\n  "private": true,\n  "tools": ["images", "pdfs", "code"]\n}',
  );
  const [indent, setIndent] = useState(2);
  const [minified, setMinified] = useState(false);
  const [view, setView] = useState("formatted");
  const parsed = useMemo(() => {
    try {
      if (input.length > 2_000_000)
        throw new Error("Use JSON under 2 MB for responsive editing.");
      const value = JSON.parse(input) as JsonValue;
      return {
        value,
        output: JSON.stringify(value, null, minified ? 0 : indent),
        error: "",
      };
    } catch (error) {
      return { value: null, output: "", error: errorMessage(error) };
    }
  }, [input, indent, minified]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className={!minified ? "btn" : "btn-secondary"}
          onClick={() => setMinified(false)}
        >
          Beautify
        </button>
        <button
          className={minified ? "btn" : "btn-secondary"}
          onClick={() => setMinified(true)}
        >
          Minify
        </button>
        <label className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          Indent
          <select
            className="input w-20"
            value={indent}
            onChange={(event) => setIndent(Number(event.target.value))}
          >
            <option value={2}>2</option>
            <option value={4}>4</option>
          </select>
        </label>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <label>
          <span className="label">Input JSON</span>
          <textarea
            className="input h-80 resize-y font-mono text-xs leading-6"
            spellCheck={false}
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </label>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label mb-0">Output</span>
            <div className="flex gap-2 text-xs">
              <button
                onClick={() => setView("formatted")}
                className={
                  view === "formatted"
                    ? "font-semibold text-violet-500"
                    : "text-slate-400"
                }
              >
                Formatted
              </button>
              <button
                onClick={() => setView("tree")}
                className={
                  view === "tree"
                    ? "font-semibold text-violet-500"
                    : "text-slate-400"
                }
              >
                Tree
              </button>
            </div>
          </div>
          <div className="h-80 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
            {parsed.error ? (
              <p className="text-xs text-rose-500">
                Enter valid JSON to see a result.
              </p>
            ) : view === "tree" ? (
              <JsonTree value={parsed.value} />
            ) : (
              <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-6">
                <HighlightJson value={parsed.output} />
              </pre>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <CopyButton text={parsed.output} />
        <button
          disabled={!parsed.output}
          className="btn-secondary"
          onClick={() =>
            downloadBlob(
              new Blob([parsed.output], { type: "application/json" }),
              "formatted.json",
            )
          }
        >
          <FileJson className="h-4 w-4" /> Download JSON
        </button>
      </div>
      <ErrorNotice message={parsed.error} />
      <p className="muted text-xs">
        Numbers use JavaScript precision. Use strings for integers larger than
        9,007,199,254,740,991.
      </p>
    </div>
  );
}
function Base64Tool() {
  const [mode, setMode] = useState("encode");
  const [input, setInput] = useState("Hello, world!");
  const [fileName, setFileName] = useState("decoded.bin");
  const [fileResult, setFileResult] = useState<string | null>(null);
  const [fileError, setFileError] = useState("");
  const [busy, setBusy] = useState(false);
  const result = useMemo(() => {
    try {
      if (input.length > 28_000_000) throw new Error("Use text under 28 MB.");
      if (mode === "encode")
        return {
          output: fileResult ?? bytesToBase64(new TextEncoder().encode(input)),
          bytes: null,
          error: "",
          binary: false,
        };
      const bytes = base64ToBytes(input);
      let output: string;
      let binary = false;
      try {
        output = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        output = `${bytes.length.toLocaleString()} binary bytes decoded. Use Download bytes to save the file.`;
        binary = true;
      }
      return { output, bytes, error: "", binary };
    } catch (error) {
      return {
        output: "",
        bytes: null,
        error: errorMessage(error),
        binary: false,
      };
    }
  }, [mode, input, fileResult]);
  async function encodeFile(files: File[]) {
    const file = files[0];
    if (!file) return;
    setBusy(true);
    setFileError("");
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error(
          "Use binary files under 20 MB to keep encoding responsive.",
        );
      setFileResult(bytesToBase64(new Uint8Array(await file.arrayBuffer())));
      setFileName(file.name);
      setInput("");
    } catch (error) {
      setFileError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["encode", "decode"].map((item) => (
          <button
            key={item}
            disabled={busy}
            className={mode === item ? "btn" : "btn-secondary"}
            onClick={() => {
              setMode(item);
              setFileResult(null);
              setFileError("");
              setInput("");
            }}
            aria-pressed={mode === item}
          >
            {item === "encode" ? "Encode" : "Decode"}
          </button>
        ))}
      </div>
      {mode === "encode" && (
        <FileDropzone
          accept="*/*"
          multiple={false}
          disabled={busy}
          onFiles={(files) => void encodeFile(files)}
          label={busy ? "Reading local file…" : "Encode a binary file"}
          hint="Any file type · Up to 20 MB"
        />
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        <label>
          <span className="label">
            {mode === "encode" ? "Text to encode" : "Base64 to decode"}
          </span>
          <textarea
            className="input h-56 font-mono text-xs leading-6"
            value={input}
            spellCheck={false}
            disabled={busy}
            onChange={(event) => {
              setInput(event.target.value);
              setFileResult(null);
            }}
          />
        </label>
        <label>
          <span className="label">
            {result.binary ? "Binary result" : "Result"}
          </span>
            <textarea
              aria-label={result.binary ? "Binary result" : "Result"}
              className="input h-56 font-mono text-xs leading-6"
              readOnly
            value={result.output}
            spellCheck={false}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <CopyButton text={result.binary ? "" : result.output} />
        {mode === "decode" && (
          <button
            disabled={!result.bytes?.length}
            className="btn-secondary"
            onClick={() => {
              if (result.bytes)
                downloadBlob(
                  new Blob([result.bytes], {
                    type: "application/octet-stream",
                  }),
                  fileName,
                );
            }}
          >
            <Download className="h-4 w-4" /> Download bytes
          </button>
        )}
      </div>
      {mode === "decode" && (
        <label>
          <span className="label">Download filename</span>
          <input
            className="input max-w-xs"
            value={fileName}
            onChange={(event) =>
              setFileName(event.target.value || "decoded.bin")
            }
          />
        </label>
      )}
      <ErrorNotice message={result.error || fileError} />
      <p className="muted text-xs">
        Supports UTF-8 text, standard Base64, URL-safe Base64, and Base64 data
        URLs. Base64 is encoding, not encryption.
      </p>
    </div>
  );
}
type Match = { index: number; text: string; groups: (string | undefined)[] };
function RegexTool() {
  const [pattern, setPattern] = useState("[A-Z]\\w+");
  const [flags, setFlags] = useState("g");
  const [input, setInput] = useState(
    "Hello LocalTools. Your files stay Private.",
  );
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [limited, setLimited] = useState(false);
  useEffect(() => {
    setMatches([]);
    setError("");
    setLimited(false);
    if (!pattern) {
      setRunning(false);
      return;
    }
    if (input.length > 1_000_000) {
      setError("Use sample text under 1 MB.");
      return;
    }
    setRunning(true);
    let worker: Worker | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const debounce = setTimeout(() => {
      try {
        worker = new Worker("/regex-worker.js");
        timeout = setTimeout(() => {
          worker?.terminate();
          setError(
            "Execution stopped after one second. Simplify the pattern to avoid excessive backtracking.",
          );
          setRunning(false);
        }, 1000);
        worker.onmessage = (event) => {
          clearTimeout(timeout);
          setMatches(event.data.matches);
          setError(event.data.error);
          setLimited(event.data.limited);
          setRunning(false);
          worker?.terminate();
        };
        worker.onerror = () => {
          clearTimeout(timeout);
          setError("The regex worker could not run in this browser.");
          setRunning(false);
          worker?.terminate();
        };
        worker.postMessage({ pattern, flags, input });
      } catch (failure) {
        clearTimeout(timeout);
        setError(errorMessage(failure));
        setRunning(false);
      }
    }, 200);
    return () => {
      clearTimeout(debounce);
      clearTimeout(timeout);
      worker?.terminate();
    };
  }, [pattern, flags, input]);
  const highlighted: React.ReactNode[] = [];
  let cursor = 0;
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    highlighted.push(
      <Fragment key={`text-${i}`}>{input.slice(cursor, match.index)}</Fragment>,
    );
    highlighted.push(
      <mark
        key={`match-${i}`}
        className="rounded bg-violet-200 text-violet-900 dark:bg-violet-900 dark:text-violet-100"
      >
        {match.text || "▏"}
      </mark>,
    );
    cursor = match.index + match.text.length;
  }
  highlighted.push(<Fragment key="last">{input.slice(cursor)}</Fragment>);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <label>
          <span className="label">Pattern</span>
          <input
            className="input font-mono"
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            spellCheck={false}
            placeholder="[A-Z]\\w+"
          />
        </label>
        <label>
          <span className="label">Flags</span>
          <input
            className="input font-mono"
            value={flags}
            onChange={(event) => setFlags(event.target.value)}
            spellCheck={false}
            placeholder="gim"
          />
        </label>
      </div>
      <label className="block">
        <span className="label">Test text</span>
        <textarea
          className="input h-40 font-mono text-xs leading-6"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          spellCheck={false}
        />
      </label>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium">Live highlighting</h2>
          <span className="text-xs text-violet-500" role="status">
            {running
              ? "Testing…"
              : `${matches.length} matches${limited ? " (first 1,000)" : ""}`}
          </span>
        </div>
        <pre className="min-h-24 whitespace-pre-wrap break-all rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-7 dark:border-slate-700 dark:bg-slate-950">
          {highlighted}
        </pre>
      </div>
      <ErrorNotice message={error} />
      {matches.length > 0 && (
        <details className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <summary className="text-sm font-medium">
            Match details & capture groups
          </summary>
          <ol className="mt-3 max-h-64 space-y-2 overflow-auto">
            {matches.map((match, i) => (
              <li
                key={i}
                className="break-all font-mono text-xs text-slate-500 dark:text-slate-400"
              >
                #{i + 1} · index {match.index} · {JSON.stringify(match.text)}
                {match.groups.length > 0 && (
                  <span className="block pl-4">
                    Groups: {JSON.stringify(match.groups)}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </details>
      )}
      <p className="muted text-xs">
        JavaScript RegExp · g = all matches, i = case-insensitive, m =
        multiline, s = dot-all, u = Unicode. Empty matches appear as a thin
        marker.
      </p>
    </div>
  );
}

export default function DeveloperTools({ mode }: { mode: string }) {
  return mode === "json-formatter" ? (
    <JsonFormatter />
  ) : mode === "base64" ? (
    <Base64Tool />
  ) : (
    <RegexTool />
  );
}
