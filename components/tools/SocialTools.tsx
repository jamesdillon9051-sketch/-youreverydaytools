"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import {
  ChevronRight,
  Download,
  ImageIcon,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Video,
  X,
} from "lucide-react";
import { downloadBlob, errorMessage, formatBytes, toBlob } from "@/lib/browser";
import {
  MAX_ZIP_BYTES,
  MAX_ZIP_FILES,
  SocialHttpError,
  fetchSocialMedia,
  isSocialSlug,
  mediaFilename,
  parseSocialResult,
  parseSocialStatus,
  readSocialJson,
  socialModes,
  validateSocialInput,
  type SocialAsset,
  type SocialCollection,
  type SocialPlatform,
  type SocialResult,
  type SocialSlug,
  type SocialStatus,
} from "@/lib/social";
import { ProgressBar, StatusNotice } from "./Shared";

type Transfer = { label: string; value?: number; detail?: string };
// The gateway fetches the whole file before it sends the first byte, so a
// download can sit at zero for a while; say so instead of looking frozen.
const waiting = "Waiting for the server…";

function joinChunks(chunks: Uint8Array[], size: number) {
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

export default function SocialTools({ mode }: { mode: string }) {
  if (!isSocialSlug(mode))
    return (
      <p
        role="alert"
        className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
      >
        This downloader is not available.
      </p>
    );
  return <SocialDownloader key={mode} mode={mode} />;
}

function SocialDownloader({ mode }: { mode: SocialSlug }) {
  const settings = socialModes[mode];
  const [platform, setPlatform] = useState<SocialPlatform>(settings.platform);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<SocialStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [statusAttempt, setStatusAttempt] = useState(0);
  const [result, setResult] = useState<SocialResult | null>(null);
  const [collections, setCollections] = useState<SocialCollection[]>([]);
  const [activeCollection, setActiveCollection] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [progress, setProgress] = useState("");
  const [expired, setExpired] = useState(false);
  const request = useRef<AbortController | null>(null);
  const lastQuery = useRef({ value: "", fromCollection: false });
  useEffect(() => {
    const controller = new AbortController();
    setStatus(null);
    setStatusError("");
    fetch("/api/social.php", { signal: controller.signal, cache: "no-store" })
      .then(readSocialJson)
      .then(parseSocialStatus)
      .then(setStatus)
      .catch((e) => {
        if (!controller.signal.aborted) setStatusError(errorMessage(e));
      });
    return () => controller.abort();
  }, [statusAttempt]);
  useEffect(() => () => request.current?.abort(), []);
  const working = busy || zipping || saving !== null;
  const available =
    status?.ready &&
    (settings.mode === "stories"
      ? status.providers.rocketApi
      : status.providers.scrapeCreators);
  const visible =
    result?.items.filter((item) => filter === "all" || item.kind === filter) ??
    [];
  function noteFailure(failure: unknown) {
    setError(errorMessage(failure));
    if (failure instanceof SocialHttpError && failure.status === 410)
      setExpired(true);
  }
  async function findMedia(value = input, fromCollection = false) {
    setError("");
    setNotice("");
    setProgress("");
    setExpired(false);
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
    lastQuery.current = { value: clean, fromCollection };
    setBusy(true);
    setZipping(false);
    setSaving(null);
    setResult(null);
    setSelected([]);
    setFilter("all");
    setTransfer({ label: "Looking up public media…" });
    // A highlight lookup keeps the list so a failure never costs another query.
    if (!fromCollection) {
      setCollections([]);
      setActiveCollection("");
    }
    try {
      const response = await fetch("/api/social.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, mode: settings.mode, input: clean }),
        signal: controller.signal,
      });
      const data = parseSocialResult(await readSocialJson(response));
      if (controller.signal.aborted) return;
      setResult(data);
      setSelected(data.items.map((item) => item.id));
      if (data.collections?.length) setCollections(data.collections);
    } catch (e) {
      if (!controller.signal.aborted) noteFailure(e);
    } finally {
      if (request.current === controller) {
        setBusy(false);
        setTransfer(null);
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
    setSaving(null);
    setTransfer(null);
    setNotice("");
    setProgress("Canceled.");
  }
  async function saveItem(item: SocialAsset) {
    if (working) return;
    const controller = new AbortController();
    request.current = controller;
    setSaving(item.id);
    setError("");
    setNotice("");
    setProgress("");
    const label = `Downloading ${item.filename}`;
    setTransfer({ label, detail: waiting });
    try {
      const media = await fetchSocialMedia(item.downloadUrl, {
        signal: controller.signal,
        onProgress: (loaded, total) =>
          setTransfer({
            label,
            value: total ? (loaded / total) * 100 : undefined,
            detail: total
              ? `${formatBytes(loaded)} of ${formatBytes(total)}`
              : formatBytes(loaded),
          }),
      });
      if (controller.signal.aborted) return;
      const name = mediaFilename(item.filename, media.extension);
      downloadBlob(new Blob(media.chunks, { type: media.mime }), name);
      setNotice(`Saved ${name} (${formatBytes(media.size)}).`);
    } catch (e) {
      if (!controller.signal.aborted) noteFailure(e);
    } finally {
      if (request.current === controller) {
        setSaving(null);
        setTransfer(null);
        request.current = null;
      }
    }
  }
  function startDownload(event: MouseEvent, item: SocialAsset) {
    // Modified clicks (new tab, save as) keep the plain link behavior.
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    void saveItem(item);
  }
  async function downloadZip() {
    const items =
      result?.items.filter((item) => selected.includes(item.id)) ?? [];
    if (!items.length || working) return;
    if (items.length > MAX_ZIP_FILES) {
      setError(
        `Select up to ${MAX_ZIP_FILES} files per ZIP. You can also download files individually.`,
      );
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setZipping(true);
    setError("");
    setNotice("");
    setProgress("");
    try {
      const entries: Record<string, Uint8Array> = {};
      let total = 0;
      for (let index = 0; index < items.length; index++) {
        const label = `Downloading file ${index + 1} of ${items.length}`;
        setTransfer({
          label,
          value: index ? (index / items.length) * 100 : undefined,
          detail: index ? formatBytes(total) : waiting,
        });
        const media = await fetchSocialMedia(items[index].downloadUrl, {
          signal: controller.signal,
          maxBytes: MAX_ZIP_BYTES - total,
          limitMessage:
            "ZIP downloads are limited to 64 MB in total. Download larger files individually.",
          onProgress: (loaded, announced) =>
            setTransfer({
              label,
              value:
                ((index + (announced ? loaded / announced : 0)) /
                  items.length) *
                100,
              detail: formatBytes(total + loaded),
            }),
        });
        total += media.size;
        entries[
          `${index + 1}-${mediaFilename(items[index].filename, media.extension)}`
        ] = joinChunks(media.chunks, media.size);
      }
      if (controller.signal.aborted) return;
      setTransfer({ label: "Preparing ZIP…" });
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
      const name = `${platform}-media.zip`;
      downloadBlob(toBlob(bytes, "application/zip"), name);
      setNotice(
        `Saved ${name} with ${items.length} file${items.length === 1 ? "" : "s"} (${formatBytes(total)}).`,
      );
    } catch (e) {
      if (!controller.signal.aborted) noteFailure(e);
    } finally {
      if (request.current === controller) {
        setZipping(false);
        setTransfer(null);
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
                setCollections([]);
                setError("");
                setNotice("");
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
          autoCapitalize="none"
          spellCheck={false}
          inputMode="url"
          disabled={busy || zipping}
          required
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="btn"
            type="submit"
            disabled={!available || working}
          >
            {busy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}{" "}
            {settings.mode === "highlights" ? "Find highlights" : "Find media"}
          </button>
          {working && (
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
      {expired && (
        <StatusNotice tone="warning">
          <p>Download links expire 15 minutes after they are created.</p>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-violet-700 disabled:opacity-50 dark:text-violet-300"
            disabled={working}
            onClick={() =>
              void findMedia(
                lastQuery.current.value,
                lastQuery.current.fromCollection,
              )
            }
          >
            <RefreshCw className="h-3 w-3" /> Fetch media again
          </button>
        </StatusNotice>
      )}
      {transfer && (
        <ProgressBar
          label={transfer.label}
          value={transfer.value}
          detail={transfer.detail}
        />
      )}
      {notice && <StatusNotice>{notice}</StatusNotice>}
      {progress && (
        <p className="muted text-xs" role="status" aria-live="polite">
          {progress}
        </p>
      )}
      {collections.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Choose a highlight</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {collections.map((collection) => (
              <button
                type="button"
                key={collection.id}
                className={`btn-secondary justify-between ${activeCollection === collection.id ? "!border-violet-400 ring-2 ring-violet-200 dark:ring-violet-900" : ""}`}
                aria-pressed={activeCollection === collection.id}
                disabled={working}
                onClick={() => {
                  setActiveCollection(collection.id);
                  void findMedia(
                    `https://www.instagram.com/stories/highlights/${collection.id}/`,
                    true,
                  );
                }}
              >
                <span className="truncate">{collection.title}</span>
                <ChevronRight className="h-4 w-4 shrink-0" />
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
              type="button"
              className="btn-secondary ml-auto"
              disabled={!selected.length || working}
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
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt={`Preview of ${item.filename}`}
                      className="h-full w-full object-contain"
                      loading="lazy"
                      decoding="async"
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
                    className={`btn-secondary w-full ${working && saving !== item.id ? "pointer-events-none opacity-50" : ""}`}
                    href={item.downloadUrl}
                    download={item.filename}
                    rel="nofollow"
                    aria-disabled={working && saving !== item.id}
                    onClick={(event) => startDownload(event, item)}
                  >
                    {saving === item.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}{" "}
                    Download {item.kind}
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
            Individual files: up to 128 MB. ZIP: up to {MAX_ZIP_FILES} selected
            files and 64 MB. Availability, resolution, audio, and watermarks
            depend on the platform and provider.
          </p>
        </section>
      )}
    </div>
  );
}
