export const socialModes = {
  "tiktok-downloader": {
    platform: "tiktok",
    mode: "post",
    name: "TikTok",
    hint: "https://www.tiktok.com/@creator/video/123456789",
  },
  "instagram-downloader": {
    platform: "instagram",
    mode: "post",
    name: "Instagram",
    hint: "https://www.instagram.com/reel/shortcode/",
  },
  "instagram-stories": {
    platform: "instagram",
    mode: "stories",
    name: "Instagram stories",
    hint: "Public username or Instagram profile URL",
  },
  "instagram-highlights": {
    platform: "instagram",
    mode: "highlights",
    name: "Instagram highlights",
    hint: "Public username or /stories/highlights/123456789/ URL",
  },
  "twitter-downloader": {
    platform: "twitter",
    mode: "post",
    name: "X / Twitter",
    hint: "https://x.com/creator/status/123456789",
  },
  "facebook-downloader": {
    platform: "facebook",
    mode: "post",
    name: "Facebook",
    hint: "https://www.facebook.com/reel/123456789",
  },
  "pinterest-downloader": {
    platform: "pinterest",
    mode: "post",
    name: "Pinterest",
    hint: "https://www.pinterest.com/pin/123456789/",
  },
  "reddit-downloader": {
    platform: "reddit",
    mode: "post",
    name: "Reddit",
    hint: "https://www.reddit.com/r/community/comments/post_id/title/",
  },
  "profile-picture-downloader": {
    platform: "instagram",
    mode: "profile",
    name: "Profile pictures",
    hint: "Public username or profile URL",
  },
} as const;
export type SocialSlug = keyof typeof socialModes;
export function isSocialSlug(value: string): value is SocialSlug {
  return Object.prototype.hasOwnProperty.call(socialModes, value);
}
export type SocialPlatform =
  "tiktok" | "instagram" | "twitter" | "facebook" | "pinterest" | "reddit";
export type SocialAsset = {
  id: string;
  kind: "photo" | "video";
  filename: string;
  downloadUrl: string;
  previewUrl?: string;
  width?: number;
  height?: number;
  note?: string;
};
export type SocialCollection = { id: string; title: string };
export type SocialResult = {
  title: string;
  items: SocialAsset[];
  collections?: SocialCollection[];
  expiresAt: number;
};
export type SocialStatus = {
  ready: boolean;
  providers: { scrapeCreators: boolean; rocketApi: boolean };
  message?: string;
};

export const MAX_ZIP_FILES = 30;
export const MAX_ZIP_BYTES = 64 * 1024 * 1024;
const MAX_RESULT_ITEMS = 100;
export const mediaExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
};

const hosts: Record<SocialPlatform, string[]> = {
  tiktok: ["tiktok.com"],
  instagram: ["instagram.com"],
  twitter: ["x.com", "twitter.com"],
  facebook: ["facebook.com", "fb.watch"],
  pinterest: ["pinterest.com", "pin.it"],
  reddit: ["reddit.com", "redd.it"],
};
export function validateSocialInput(
  platform: SocialPlatform,
  mode: string,
  value: string,
): string {
  let input = value.trim();
  if (!input || input.length > 2048)
    throw new Error("Enter a public link or username, up to 2,048 characters.");
  if (mode !== "post" && /^@?[a-zA-Z0-9_.]{1,64}$/.test(input))
    return input.replace(/^@/, "");
  // People often paste "x.com/user/status/1" without the scheme.
  const domains = hosts[platform] ?? [];
  if (
    domains.some((host) =>
      new RegExp(
        `^(?:[a-z0-9-]+\\.)*${host.replace(".", "\\.")}(?:[/?#]|$)`,
        "i",
      ).test(input),
    )
  )
    input = `https://${input}`;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error(
      mode === "post"
        ? "Paste a complete HTTPS post link."
        : "Enter a public username or a complete HTTPS profile link.",
    );
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !domains.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    )
  )
    throw new Error(
      `Use a public HTTPS link from ${platform === "twitter" ? "X or Twitter" : platform}.`,
    );
  url.hash = "";
  return url.href;
}

/** Thrown for HTTP failures so callers can react to specific statuses. */
export class SocialHttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SocialHttpError";
    this.status = status;
  }
}
function statusMessage(status: number) {
  if (status === 400)
    return "The request was not accepted. Check the link and try again.";
  if (status === 403)
    return "This download link is not valid. Fetch the media again.";
  if (status === 404)
    return "The download service could not be found. It may not be activated on this site yet.";
  if (status === 408 || status === 504)
    return "The download service timed out. Please try again.";
  if (status === 410)
    return "This download link has expired. Fetch the media again.";
  if (status === 413) return "This file is too large to download.";
  if (status === 429)
    return "The download limit was reached. Please wait a while and try again.";
  if (status >= 500)
    return "The download service had a problem. Please try again in a few minutes.";
  return "The download service could not complete this request.";
}
/** The friendliest message available for a failed gateway response. */
export async function socialResponseError(response: Response) {
  if (response.headers.get("content-type")?.includes("application/json")) {
    try {
      const data: unknown = await response.json();
      const message = (data as { error?: unknown } | null)?.error;
      if (typeof message === "string" && message) return message;
    } catch {
      // Fall back to the status text below.
    }
  }
  return statusMessage(response.status);
}
/** Read a JSON reply from the gateway, with readable errors for every failure. */
export async function readSocialJson(response: Response): Promise<unknown> {
  if (!response.headers.get("content-type")?.includes("application/json")) {
    // A static host without PHP answers with HTML or the raw script.
    throw new SocialHttpError(
      response.status === 429 || response.status >= 500
        ? statusMessage(response.status)
        : "The download service is not available yet. Please try again after site activation.",
      response.status,
    );
  }
  if (!response.ok)
    throw new SocialHttpError(
      await socialResponseError(response),
      response.status,
    );
  try {
    return await response.json();
  } catch {
    throw new SocialHttpError(
      "The download service sent an unreadable response. Please try again.",
      response.status,
    );
  }
}

const downloadPrefix = "/api/social-download.php?token=";
const previewPrefix = "/api/social-download.php?inline=1&token=";
const tokenPattern = /^[A-Za-z0-9_.-]+$/;
export function isSafeDownloadUrl(url: unknown): url is string {
  return (
    typeof url === "string" &&
    url.startsWith(downloadPrefix) &&
    tokenPattern.test(url.slice(downloadPrefix.length))
  );
}
export function isSafePreviewUrl(url: unknown): url is string {
  return (
    typeof url === "string" &&
    url.startsWith(previewPrefix) &&
    tokenPattern.test(url.slice(previewPrefix.length))
  );
}
const invalidResponse = () =>
  new Error("The service returned an invalid download response.");
const finiteNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
/** Validate the gateway's JSON before it reaches the UI or an href. */
export function parseSocialResult(data: unknown): SocialResult {
  const body = data as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || !Array.isArray(body.items))
    throw invalidResponse();
  if (body.items.length > MAX_RESULT_ITEMS) throw invalidResponse();
  const seen = new Set<string>();
  const items = body.items.map((raw: unknown): SocialAsset => {
    const item = raw as Record<string, unknown> | null;
    if (
      !item ||
      typeof item !== "object" ||
      (item.kind !== "photo" && item.kind !== "video") ||
      typeof item.filename !== "string" ||
      !isSafeDownloadUrl(item.downloadUrl)
    )
      throw invalidResponse();
    const id = String(item.id ?? "");
    if (!id || seen.has(id)) throw invalidResponse();
    seen.add(id);
    return {
      id,
      kind: item.kind,
      filename: item.filename.replace(/[^a-zA-Z0-9_.-]/g, "-").slice(0, 120),
      downloadUrl: item.downloadUrl,
      previewUrl: isSafePreviewUrl(item.previewUrl)
        ? item.previewUrl
        : undefined,
      width: finiteNumber(item.width),
      height: finiteNumber(item.height),
      note: typeof item.note === "string" ? item.note.slice(0, 300) : undefined,
    };
  });
  const collections = Array.isArray(body.collections)
    ? body.collections
        .map((raw: unknown) => raw as Record<string, unknown> | null)
        .filter(
          (entry): entry is Record<string, unknown> =>
            !!entry &&
            typeof entry === "object" &&
            /^\d{1,30}$/.test(String(entry.id ?? "")),
        )
        .slice(0, MAX_RESULT_ITEMS)
        .map((entry) => ({
          id: String(entry.id),
          title:
            typeof entry.title === "string" && entry.title.trim()
              ? entry.title.slice(0, 150)
              : "Highlight",
        }))
    : [];
  return {
    title: typeof body.title === "string" ? body.title : "Public media",
    items,
    collections,
    expiresAt:
      typeof body.expiresAt === "number" && Number.isFinite(body.expiresAt)
        ? body.expiresAt
        : Math.floor(Date.now() / 1000) + 900,
  };
}
export function parseSocialStatus(data: unknown): SocialStatus {
  const body = data as Record<string, unknown> | null;
  if (!body || typeof body !== "object")
    throw new Error(
      "The download service is not available yet. Please try again after site activation.",
    );
  const providers = (body.providers ?? {}) as Record<string, unknown>;
  return {
    ready: body.ready === true,
    providers: {
      scrapeCreators: providers.scrapeCreators === true,
      rocketApi: providers.rocketApi === true,
    },
    message: typeof body.message === "string" ? body.message : undefined,
  };
}

export type FetchedMedia = {
  chunks: Uint8Array<ArrayBuffer>[];
  size: number;
  mime: string;
  extension: string;
};
/**
 * Download one signed media file into memory with progress, size limits, and
 * human-readable failures (expired link, usage limit, upstream error).
 */
export async function fetchSocialMedia(
  url: string,
  options: {
    signal?: AbortSignal;
    /** Abort and fail once more than this many bytes arrive. */
    maxBytes?: number;
    limitMessage?: string;
    onProgress?: (loaded: number, total?: number) => void;
  } = {},
): Promise<FetchedMedia> {
  if (!isSafeDownloadUrl(url) && !isSafePreviewUrl(url))
    throw invalidResponse();
  const { signal, maxBytes = Infinity, onProgress } = options;
  const tooLarge = () =>
    new Error(
      options.limitMessage ?? "This file is larger than the download limit.",
    );
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok)
    throw new SocialHttpError(
      await socialResponseError(response),
      response.status,
    );
  const mime = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const extension = mediaExtensions[mime];
  if (!extension)
    throw new Error("The service returned an unsupported file type.");
  const announced = Number(response.headers.get("content-length")) || undefined;
  if (announced !== undefined && announced > maxBytes) throw tooLarge();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  if (!response.body) {
    // Very old browsers cannot stream; read the body in one piece instead.
    const whole = new Uint8Array(await response.arrayBuffer());
    if (whole.length > maxBytes) throw tooLarge();
    onProgress?.(whole.length, whole.length);
    return { chunks: [whole], size: whole.length, mime, extension };
  }
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw tooLarge();
      }
      chunks.push(value as Uint8Array<ArrayBuffer>);
      onProgress?.(size, announced);
    }
  } finally {
    reader.releaseLock();
  }
  if (!size) throw new Error("The service returned an empty file.");
  return { chunks, size, mime, extension };
}
/** A download name using the real file type returned by the gateway. */
export function mediaFilename(filename: string, extension: string) {
  const base = filename
    .replace(/[^a-zA-Z0-9_.-]/g, "-")
    .replace(/\.[^.]+$/, "");
  return `${base || "media"}.${extension}`;
}
