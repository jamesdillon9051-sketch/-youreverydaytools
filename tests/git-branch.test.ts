import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("compiled branch publication creates, updates, and preserves unchanged builds", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/hostinger.yml", import.meta.url),
    "utf8",
  );
  const match = workflow.match(
    /      - name: Publish static files at the branch root[\s\S]*?        run: \|\n([\s\S]*?)(?=\n  deploy:)/,
  );
  assert.ok(match, "The branch publication step must be present.");
  const script = match[1]
    .split("\n")
    .map((line) => line.replace(/^          /, ""))
    .join("\n");
  const directory = mkdtempSync(join(tmpdir(), "hostinger-branch-test-"));
  const source = join(directory, "source");
  const remote = join(directory, "remote.git");
  const runner = join(directory, "runner");
  const website = join(runner, "static-website");
  const git = (args: string[], cwd = source) =>
    execFileSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" }).trim();

  try {
    mkdirSync(source);
    mkdirSync(join(source, ".github", "workflows"), { recursive: true });
    mkdirSync(join(website, "_next", "static"), { recursive: true });
    writeFileSync(join(source, "README.md"), "Source lives on main.\n");
    writeFileSync(join(source, ".gitignore"), "out/\n");
    writeFileSync(
      join(source, ".github", "workflows", "hostinger.yml"),
      workflow,
    );
    writeFileSync(join(website, "index.html"), "<h1>First build</h1>\n");
    writeFileSync(join(website, ".htaccess"), "DirectoryIndex index.html\n");
    writeFileSync(
      join(website, "_next", "static", "app.js"),
      "console.log('static');\n",
    );
    git(["init", "--bare", remote], directory);
    git(["init", "--initial-branch=main"]);
    git(["config", "user.name", "Deployment test"]);
    git(["config", "user.email", "deployment-test@localhost"]);
    git(["add", "--all"]);
    git(["commit", "-m", "Source project"]);
    const main = git(["rev-parse", "HEAD"]);
    git(["remote", "add", "origin", remote]);
    git(["push", "origin", "main"]);
    const publish = () => {
      execFileSync("bash", ["-e", "-c", script], {
        cwd: source,
        env: {
          ...process.env,
          SOURCE_SHA: main,
          RUNNER_TEMP: runner,
          GITHUB_STEP_SUMMARY: join(directory, "summary.md"),
        },
        stdio: "pipe",
      });
    };

    publish();
    git(["--git-dir", remote, "merge-base", "--is-ancestor", main, "hostinger"]);
    assert.equal(
      git(["--git-dir", remote, "show", "hostinger:index.html"]),
      "<h1>First build</h1>",
    );
    assert.deepEqual(
      git([
        "--git-dir",
        remote,
        "ls-tree",
        "-r",
        "--name-only",
        "hostinger",
      ]).split("\n"),
      [".htaccess", "_next/static/app.js", "index.html"],
    );
    const first = git(["--git-dir", remote, "rev-parse", "hostinger"]);

    git(["checkout", "main"]);
    writeFileSync(join(website, "index.html"), "<h1>Second build</h1>\n");
    publish();
    const second = git(["--git-dir", remote, "rev-parse", "hostinger"]);
    assert.notEqual(first, second);
    assert.equal(
      git(["--git-dir", remote, "show", "hostinger:index.html"]),
      "<h1>Second build</h1>",
    );
    assert.equal(
      git(["--git-dir", remote, "rev-list", "--count", "hostinger", `^${main}`]),
      "2",
    );

    git(["checkout", "main"]);
    publish();
    assert.equal(git(["--git-dir", remote, "rev-parse", "hostinger"]), second);
    assert.equal(git(["--git-dir", remote, "rev-parse", "main"]), main);
    assert.equal(
      git(["--git-dir", remote, "show", "main:README.md"]),
      "Source lives on main.",
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
