"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Download,
  ExternalLink,
  ImageIcon,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Video,
  X,
} from "lucide-react";
import { downloadBlob, errorMessage, formatBytes } from "@/lib/browser";
import {
  socialModes,
  validateSocialInput,
  type SocialPlatform,
  type SocialResult,
  type SocialSlug,
  type SocialStatus,
} from "@/lib/social";

async function readJson(response: Response) {
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error(
      "The download service is not available yet. Please try again after site activation.",
    );
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : "The download service could not complete this request.",
    );
  return data;
}
function safeDownload(url: string) {
  return (
    url.startsWith("/api/social-download.php?token=") && !/[\r\n]/.test(url)
  );
}

export default function SocialTools({ mode }: { mode: string }) {
  const settings = socialModes[mode as SocialSlug];
  const [platform, setPlatform] = useState<SocialPlatform>(settings.platform);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<SocialStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [statusAttempt, setStatusAttempt] = useState(0);
  const [result, setResult] = useState<SocialResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [progress, setProgress] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setStatus(null);
    setStatusError("");
    fetch("/api/social.php", { signal: controller.signal, cache: "no-store" })
      .then(readJson)
      .then(setStatus)
      .catch((e) => {
        if (!controller.signal.aborted) setStatusError(errorMessage(e));
      });
    return () => controller.abort();
  }, [statusAttempt]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    request.current?.abort();
    setPlatform(settings.platform);
    setInput("");
    setResult(null);
    setSelected([]);
    setError("");
    setBusy(false);
    setZipping(false);
    setProgress("");
  }, [mode, settings.platform]);
  const available =
    status?.ready &&
    (settings.mode === "stories"
      ? status.providers.rocketApi
      : status.providers.scrapeCreators);
  const visible =
    result?.items.filter((item) => filter === "all" || item.kind === filter) ??
    [];
  async function findMedia(value = input) {
    setError("");
    let clean: string;
    try {
      clean = validateSocialInput(platform, settings.mode, value);
    } catch (e) {
      setError(errorMessage(e));
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setResult(null);
    setSelected([]);
    setProgress("");
    try {
      const response = await fetch("/api/social.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, mode: settings.mode, input: clean }),
        signal: controller.signal,
      });
      const data: SocialResult = await readJson(response);
      if (
        !Array.isArray(data.items) ||
        data.items.some((item) => !safeDownload(item.downloadUrl))
      )
        throw new Error("The service returned an invalid download response.");
      setResult(data);
      setSelected(data.items.map((item) => item.id));
    } catch (e) {
      if (!controller.signal.aborted) setError(errorMessage(e));
    } finally {
      if (request.current === controller) {
        setBusy(false);
        request.current = null;
      }
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void findMedia();
  }
  function cancel() {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setZipping(false);
    setProgress("Canceled.");
  }
  async function downloadZip() {
    const items =
      result?.items.filter((item) => selected.includes(item.id)) ?? [];
    if (!items.length) return;
    if (items.length > 30) {
      setError(
        "Select up to 30 files per ZIP. You can also download files individually.",
      );
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setZipping(true);
    setError("");
    try {
      const entries: Record<string, Uint8Array> = {};
      let total = 0;
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        setProgress(
          `Downloading ${index + 1} of ${items.length}… ${formatBytes(total)}`,
        );
        const response = await fetch(item.downloadUrl, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          await readJson(response);
          throw new Error("The media download failed. Fetch the post again.");
        }
        if (
          !/^(image\/(jpeg|png|webp|gif|avif)|video\/mp4)(;|$)/.test(
            response.headers.get("content-type") ?? "",
          )
        )
          throw new Error("The service returned an unsupported file.");
        const announced = Number(response.headers.get("content-length") || 0);
        if (announced + total > 64 * 1024 * 1024)
          throw new Error(
            "ZIP downloads are limited to 64 MB in total. Download larger files individually.",
          );
        if (!response.body)
          throw new Error("Your browser could not read this download.");
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.length;
            size += value.length;
            if (total > 64 * 1024 * 1024) {
              await reader.cancel();
              throw new Error(
                "ZIP downloads are limited to 64 MB in total. Download larger files individually.",
              );
            }
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.length;
        }
        const mime = response.headers.get("content-type")!.split(";")[0];
        const extensions: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "image/gif": "gif",
          "image/avif": "avif",
          "video/mp4": "mp4",
        };
        const basename = item.filename
          .replace(/[^a-zA-Z0-9_.-]/g, "-")
          .replace(/\.[^.]+$/, "");
        entries[`${index + 1}-${basename}.${extensions[mime]}`] = bytes;
      }
      if (controller.signal.aborted) return;
      setProgress("Preparing ZIP…");
      const { zip } = await import("fflate");
      const bytes = await new Promise<Uint8Array>((resolve, reject) => {
        const terminate = zip(entries, { level: 0 }, (e, data) => {
          controller.signal.removeEventListener("abort", abort);
          if (e) reject(e);
          else resolve(data);
        });
        function abort() {
          terminate();
          reject(new DOMException("Canceled", "AbortError"));
        }
        controller.signal.addEventListener("abort", abort, { once: true });
      });
      if (controller.signal.aborted) return;
      downloadBlob(
        new Blob([new Uint8Array(bytes)], { type: "application/zip" }),
        `${platform}-media.zip`,
      );
      setProgress(`Downloaded ${items.length} files (${formatBytes(total)}).`);
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(errorMessage(e));
        setProgress("");
      }
    } finally {
      if (request.current === controller) {
        setZipping(false);
        request.current = null;
      }
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs leading-5 text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Public media only. Your pasted link or username is sent to our
          download service and its data provider. Download content you own or
          have permission to save. Private accounts, expired stories, and
          restricted posts are unavailable.
        </p>
      </div>
      {(!available || statusError) && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30"
          role="status"
        >
          <p>
            {statusError ||
              (status
                ? "This downloader is awaiting activation by the site operator. Our image, PDF, developer, calculator, and generator tools are available now."
                : "Checking download service…")}
          </p>
          {(status || statusError) && (
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-violet-600 dark:text-violet-400"
              onClick={() => setStatusAttempt((value) => value + 1)}
            >
              <RefreshCw className="h-3 w-3" /> Check again
            </button>
          )}
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        {settings.mode === "profile" && (
          <label className="label">
            Platform
            <select
              className="input mt-2"
              value={platform}
              disabled={busy || zipping}
              onChange={(e) => {
                setPlatform(e.target.value as SocialPlatform);
                setResult(null);
                setError("");
              }}
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="twitter">X / Twitter</option>
            </select>
          </label>
        )}
        <label className="label" htmlFor="social-input">
          {settings.mode === "post"
            ? "Public post link"
            : settings.mode === "highlights"
              ? "Username or highlight link"
              : "Public username or profile link"}
        </label>
        <input
          id="social-input"
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={settings.hint}
          maxLength={2048}
          autoComplete="off"
          spellCheck={false}
          disabled={busy || zipping}
          required
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="btn"
            type="submit"
            disabled={!available || busy || zipping}
          >
            {busy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}{" "}
            {settings.mode === "highlights" ? "Find highlights" : "Find media"}
          </button>
          {(busy || zipping) && (
            <button type="button" className="btn-secondary" onClick={cancel}>
              <X className="h-4 w-4" /> Cancel
            </button>
          )}
        </div>
      </form>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
        >
          {error}
        </p>
      )}
      {result?.collections && result.collections.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Choose a highlight</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {result.collections.map((collection) => (
              <button
                key={collection.id}
                className="btn-secondary justify-between"
                disabled={busy || zipping}
                onClick={() =>
                  findMedia(
                    `https://www.instagram.com/stories/highlights/${collection.id}/`,
                  )
                }
              >
                {collection.title}
                <ExternalLink className="h-4 w-4" />
              </button>
            ))}
          </div>
        </section>
      )}
      {result && result.items.length > 0 && (
        <section className="space-y-4" aria-label="Download results">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">
                {result.items.length} file{result.items.length === 1 ? "" : "s"}{" "}
                found
              </h3>
              <p className="muted mt-1 text-xs">
                Highest quality returned by the provider. Links expire in 15
                minutes.
              </p>
            </div>
            <select
              className="input w-auto"
              aria-label="Filter media"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All media</option>
              <option value="photo">Photos</option>
              <option value="video">Videos</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={
                  visible.length > 0 &&
                  visible.every((item) => selected.includes(item.id))
                }
                disabled={zipping}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [
                          ...new Set([
                            ...selected,
                            ...visible.map((item) => item.id),
                          ]),
                        ]
                      : selected.filter(
                          (id) => !visible.some((item) => item.id === id),
                        ),
                  )
                }
              />{" "}
              Select visible files
            </label>
            <button
              className="btn-secondary ml-auto"
              disabled={!selected.length || zipping || busy}
              onClick={downloadZip}
            >
              {zipping ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}{" "}
              Download selected ZIP ({selected.length})
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
              >
                <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 dark:bg-slate-800">
                  {item.previewUrl?.startsWith(
                    "/api/social-download.php?inline=1&token=",
                  ) ? (
                    <img
                      src={item.previewUrl}
                      alt={`Preview of ${item.filename}`}
                      className="h-full w-full object-contain"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.visibility = "hidden";
                      }}
                    />
                  ) : item.kind === "video" ? (
                    <Video className="h-10 w-10 text-slate-400" />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-slate-400" />
                  )}
                </div>
                <div className="space-y-3 p-4">
                  <label className="flex items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      disabled={zipping}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, item.id]
                            : selected.filter((id) => id !== item.id),
                        )
                      }
                    />
                    <span className="truncate">{item.filename}</span>
                  </label>
                  <p className="text-xs text-slate-500">
                    {item.kind === "video" ? "MP4 video" : "Photo"}
                    {item.width && item.height
                      ? ` · ${item.width} × ${item.height}`
                      : ""}
                  </p>
                  {item.note && <p className="muted text-xs">{item.note}</p>}
                  <a
                    className="btn-secondary w-full"
                    href={item.downloadUrl}
                    download={item.filename}
                    rel="nofollow"
                  >
                    <Download className="h-4 w-4" /> Download {item.kind}
                  </a>
                </div>
              </article>
            ))}
          </div>
          {!visible.length && (
            <p className="muted">
              There are no files of this type in the result.
            </p>
          )}
          <p className="muted text-xs">
            Individual files: up to 128 MB. ZIP: up to 30 selected files and 64
            MB. Availability, resolution, audio, and watermarks depend on the
            platform and provider.
          </p>
        </section>
      )}
      {progress && (
        <p className="muted text-xs" role="status" aria-live="polite">
          {progress}
        </p>
      )}
    </div>
  );
}
