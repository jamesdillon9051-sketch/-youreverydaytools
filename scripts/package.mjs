import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { join, relative, basename } from "node:path";
import { zipSync } from "fflate";

const root = process.cwd();
const artifacts = join(root, "artifacts");
await mkdir(artifacts, { recursive: true });

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

const output = join(root, "out");
const websiteFiles = await collect(output);
if (!websiteFiles.includes(join(output, "index.html")))
  throw new Error("Build the static export before packaging.");
const websiteEntries = {};
for (const file of websiteFiles)
  websiteEntries[relative(output, file)] = new Uint8Array(await readFile(file));
await writeFile(
  join(artifacts, "localtools-hostinger.zip"),
  zipSync(websiteEntries, { level: 6 }),
);

const folders = [
  ".github",
  "app",
  "components",
  "docs",
  "lib",
  "public",
  "scripts",
  "tests",
];
const rootNames = [
  ".env.example",
  ".gitignore",
  "next-env.d.ts",
  "next.config.ts",
  "package.json",
  "package-lock.json",
  "playwright.config.ts",
  "postcss.config.mjs",
  "README.md",
  "tsconfig.json",
];
const sourceFiles = [];
for (const folder of folders)
  sourceFiles.push(...(await collect(join(root, folder))));
for (const name of rootNames) sourceFiles.push(join(root, name));
sourceFiles.sort((a, b) => relative(root, a).localeCompare(relative(root, b)));
const sourceEntries = {};
for (const file of sourceFiles)
  sourceEntries[relative(root, file)] = new Uint8Array(await readFile(file));
sourceEntries["next-env.d.ts"] = new TextEncoder().encode(
  '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n',
);
await writeFile(
  join(artifacts, "localtools-source.zip"),
  zipSync(sourceEntries, { level: 6 }),
);

function tree(paths, prefix = "") {
  const groups = new Map();
  for (const path of paths) {
    const [name, ...rest] = path.split("/");
    if (!groups.has(name)) groups.set(name, []);
    if (rest.length) groups.get(name).push(rest.join("/"));
  }
  let text = "";
  const entries = [...groups.entries()];
  for (let index = 0; index < entries.length; index++) {
    const [name, children] = entries[index];
    const last = index === entries.length - 1;
    text += `${prefix}${last ? "└── " : "├── "}${name}${children.length ? "/" : ""}\n`;
    if (children.length)
      text += tree(children, `${prefix}${last ? "    " : "│   "}`);
  }
  return text;
}
const extensions = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  mjs: "javascript",
  css: "css",
  json: "json",
  md: "markdown",
  svg: "xml",
};
let sourceDocument =
  "# LocalTools — complete source code\n\nEvery source file is included below without truncation. The source ZIP contains these files in their original paths. The Hostinger ZIP contains the compiled static website.\n\n## Directory tree\n\n```text\nlocaltools/\n" +
  tree(sourceFiles.map((file) => relative(root, file))) +
  "```\n\n";
for (const file of sourceFiles) {
  const name = relative(root, file);
  const bytes = Buffer.from(sourceEntries[name]);
  sourceDocument += `## ${name}\n\n`;
  if (name.endsWith(".png"))
    sourceDocument +=
      "This binary PNG is provided in both ZIPs. Its complete Base64 encoding is included for reconstruction.\n\n```base64\n" +
      bytes.toString("base64") +
      "\n```\n\n";
  else {
    const language = extensions[basename(file).split(".").at(-1)] || "text";
    const contents = bytes.toString("utf8");
    const fence = contents.includes("```") ? "````" : "```";
    sourceDocument += `${fence}${language}\n${contents}${contents.endsWith("\n") ? "" : "\n"}${fence}\n\n`;
  }
}
await writeFile(join(artifacts, "FULL-SOURCE.md"), sourceDocument);

const sitemap = await readFile(join(output, "sitemap.xml"), "utf8");
const match = sitemap.match(/<loc>(https?:\/\/[^<]+)<\/loc>/);
const domain = match ? new URL(match[1]).origin : "the configured domain";
const guide = `# Hostinger upload instructions\n\nConfigured website: **${domain}**\n\n1. Open Hostinger hPanel → Websites → your website → File Manager.\n2. Open the domain's document root, normally \`public_html\`. Back up any existing files first.\n3. Upload \`localtools-hostinger.zip\` and extract it directly into that document root.\n4. Confirm \`index.html\`, \`_next/\`, \`tools/\`, \`about/\`, \`privacy-policy/\`, and \`.htaccess\` are directly inside the document root. Do not create an extra \`out/\` folder.\n5. Enable HTTPS for the domain. Check ${domain}/ and a tool page.\n6. Check ${domain}/sitemap.xml and ${domain}/robots.txt. Submit the sitemap URL in Google Search Console.\n\nThe hosting ZIP includes all 15 tools, five category pages, About Us, Privacy Policy, SEO metadata, structured data, static assets, a custom 404 page, and Apache configuration. No Node.js, database, or processing server is needed on Hostinger.\n\nThe separate \`localtools-source.zip\` is for editing and rebuilding. Keep it outside \`public_html\`. \`FULL-SOURCE.md\` contains the complete directory tree and every source file.\n`;
await writeFile(join(artifacts, "HOSTINGER-UPLOAD.md"), guide);
console.log(
  `Created Hostinger ZIP (${websiteFiles.length} files), source ZIP (${sourceFiles.length} files), full source document, and upload guide for ${domain}.`,
);
