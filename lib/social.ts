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
export type SocialResult = {
  title: string;
  items: SocialAsset[];
  collections?: { id: string; title: string }[];
  expiresAt: number;
};
export type SocialStatus = {
  ready: boolean;
  providers: { scrapeCreators: boolean; rocketApi: boolean };
  message?: string;
};
export function validateSocialInput(
  platform: SocialPlatform,
  mode: string,
  value: string,
): string {
  const input = value.trim();
  if (!input || input.length > 2048)
    throw new Error("Enter a public link or username, up to 2,048 characters.");
  if (mode !== "post" && /^@?[a-zA-Z0-9_.]{1,64}$/.test(input))
    return input.replace(/^@/, "");
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
  const hosts: Record<SocialPlatform, string[]> = {
    tiktok: ["tiktok.com"],
    instagram: ["instagram.com"],
    twitter: ["x.com", "twitter.com"],
    facebook: ["facebook.com", "fb.watch"],
    pinterest: ["pinterest.com", "pin.it"],
    reddit: ["reddit.com", "redd.it"],
  };
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !hosts[platform].some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    )
  )
    throw new Error(
      `Use a public HTTPS link from ${platform === "twitter" ? "X or Twitter" : platform}.`,
    );
  url.hash = "";
  return url.href;
}
