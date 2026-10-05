import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function deploymentConfig(environment) {
  const required = [
    "HOSTINGER_FTP_SERVER",
    "HOSTINGER_FTP_USERNAME",
    "HOSTINGER_FTP_PASSWORD",
    "HOSTINGER_FTP_DIRECTORY",
  ];
  const missing = required.filter((name) => !environment[name]?.trim());
  if (missing.length) {
    throw new Error(
      `Add these GitHub Actions secrets before deploying: ${missing.join(", ")}. See docs/GITHUB-HOSTINGER.md.`,
    );
  }
  const server = environment.HOSTINGER_FTP_SERVER.trim();
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(server)) {
    throw new Error(
      "HOSTINGER_FTP_SERVER must be a hostname or IPv4 address, without a protocol, port, or path.",
    );
  }
  const username = environment.HOSTINGER_FTP_USERNAME;
  if (/[\r\n\0,]/.test(username))
    throw new Error("The FTP username contains unsupported characters.");
  const directory = environment.HOSTINGER_FTP_DIRECTORY.trim();
  if (
    !/^\/[a-zA-Z0-9._/-]*$/.test(directory) ||
    directory.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error(
      "HOSTINGER_FTP_DIRECTORY must be an absolute FTP path without spaces or traversal segments. A scoped website FTP account can use /.",
    );
  }
  const port = Number(environment.HOSTINGER_FTP_PORT || "21");
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("HOSTINGER_FTP_PORT must be a valid port number.");
  return {
    server,
    username,
    password: environment.HOSTINGER_FTP_PASSWORD,
    directory,
    port,
  };
}

export function deploymentCommands(directory) {
  return [
    "set cmd:fail-exit yes",
    "set net:timeout 30",
    "set net:max-retries 2",
    "set net:reconnect-interval-base 5",
    "set ftp:passive-mode true",
    "set ftp:ssl-force true",
    "set ftp:ssl-protect-data true",
    "set ssl:verify-certificate true",
    `cd "${directory}"`,
    "mirror --reverse --parallel=2 --no-perms --verbose out/ ./",
    "bye",
  ].join("; ");
}

async function deploy() {
  const config = deploymentConfig(process.env);
  await access(resolve("out/index.html"));
  await access(resolve("out/.htaccess"));
  console.log(
    "Uploading the tested static export to Hostinger over explicit FTPS. Existing remote files are retained.",
  );
  const status = await new Promise((resolveStatus, reject) => {
    const child = spawn(
      "lftp",
      [
        "--env-password",
        "-u",
        config.username,
        "-p",
        String(config.port),
        `ftp://${config.server}`,
        "-e",
        deploymentCommands(config.directory),
      ],
      {
        stdio: "inherit",
        env: { ...process.env, LFTP_PASSWORD: config.password },
      },
    );
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal)
        reject(new Error(`The FTPS upload was interrupted by ${signal}.`));
      else resolveStatus(code ?? 1);
    });
  });
  if (status !== 0)
    throw new Error(
      `Hostinger upload failed with exit code ${status}. Check the FTP hostname, account directory, credentials, and TLS support.`,
    );
  console.log("Static website upload completed.");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  deploy().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
