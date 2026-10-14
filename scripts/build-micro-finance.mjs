// Rebuilds public/finance/, the Micro Finance app that this site serves at /finance/, from the commit of
// the app's repository pinned in scripts/micro-finance/source.json plus scripts/micro-finance/subpath.patch
// (which teaches the app to run from a folder instead of the root of its own address).
//
//   node scripts/build-micro-finance.mjs [--repository <url-or-path>] [--skip-tests]
//
// Run it by hand when the app changes and commit the result. The website's deploy never runs it: it
// publishes the files already committed in public/finance/, so a broken app repository cannot break a deploy.
import { execFileSync } from "node:child_process";
import { copyFile, cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = JSON.parse(
  await readFile(join(root, "scripts/micro-finance/source.json"), "utf8"),
);
const patch = join(root, "scripts/micro-finance/subpath.patch");
const target = join(root, "public", source.folder);

const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
};
const repository = option("--repository") ?? source.repository;
const skipTests = args.includes("--skip-tests");

const run = (command, commandArgs, cwd) =>
  execFileSync(command, commandArgs, { cwd, stdio: "inherit" });

const work = await mkdtemp(join(tmpdir(), "micro-finance-"));
try {
  const checkout = join(work, "app");
  console.log(`Cloning ${repository} at ${source.commit}`);
  run("git", ["clone", "--quiet", repository, checkout]);
  run(
    "git",
    ["-c", "advice.detachedHead=false", "checkout", "--quiet", source.commit],
    checkout,
  );

  // Fails here, before anything is built, if the pinned commit and the patch have drifted apart.
  run("git", ["apply", "--check", patch], checkout);
  run("git", ["apply", patch], checkout);

  run("npm", ["ci", "--no-audit", "--no-fund"], checkout);
  run("npm", ["run", "typecheck"], checkout);
  if (!skipTests) run("npm", ["test"], checkout);

  const output = join(work, "out");
  run(
    "npx",
    [
      "--no-install",
      "vite",
      "build",
      `--base=/${source.folder}/`,
      "--outDir",
      output,
      "--emptyOutDir",
    ],
    checkout,
  );

  await rm(target, { recursive: true, force: true });
  await cp(output, target, { recursive: true });
  // Cache rules live in folders of their own, so a mistake in them can only affect the app, never the site.
  await copyFile(
    join(root, "scripts/micro-finance/app.htaccess"),
    join(target, ".htaccess"),
  );
  await copyFile(
    join(root, "scripts/micro-finance/assets.htaccess"),
    join(target, "assets/.htaccess"),
  );
  console.log(
    `\nWrote ${target}. Commit public/${source.folder}/ together with any change to scripts/micro-finance/.`,
  );
} finally {
  await rm(work, { recursive: true, force: true });
}
