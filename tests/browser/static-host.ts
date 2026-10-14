import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize, resolve } from "node:path";

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

/**
 * Serves the static export the way the Apache/LiteSpeed host does: a folder answers with its index.html
 * (and /folder is sent on to /folder/), an unknown path gets 404.html with a 404, and the cache rules from
 * the .htaccess files apply. Unlike `serve` it can be stopped in the middle of a test, which is how
 * "works offline" is proven.
 */
export async function startStaticHost(root = resolve("out")) {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://host");
    const pathname = decodeURIComponent(url.pathname);
    let file = join(root, normalize(pathname));
    if (!file.startsWith(root)) {
      response.writeHead(400).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) {
      if (!pathname.endsWith("/")) {
        response
          .writeHead(301, { Location: `${pathname}/${url.search}` })
          .end();
        return;
      }
      file = join(file, "index.html");
    }
    let status = 200;
    if (!existsSync(file)) {
      status = 404;
      file = join(root, "404.html");
    }
    const headers: Record<string, string> = {
      "Content-Type": types[extname(file)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    };
    // public/.htaccess and public/finance/**/.htaccess
    if (
      pathname.startsWith("/_next/static/") ||
      pathname.startsWith("/finance/assets/")
    )
      headers["Cache-Control"] = "public, max-age=31536000, immutable";
    if (
      status === 200 &&
      [
        "/finance/",
        "/finance/index.html",
        "/finance/sw.js",
        "/finance/manifest.json",
      ].includes(pathname)
    )
      headers["Cache-Control"] = "no-cache";
    response.writeHead(status, headers);
    createReadStream(file).pipe(response);
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const { port } = server.address() as AddressInfo;
  let stopped = false;
  return {
    origin: `http://127.0.0.1:${port}`,
    /** Stops answering, as a phone with no signal would experience it. Safe to call twice. */
    async stop() {
      if (stopped) return;
      stopped = true;
      server.closeAllConnections();
      await new Promise<void>((done) => server.close(() => done()));
    },
  };
}
