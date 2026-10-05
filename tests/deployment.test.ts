import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deploymentConfig,
  deploymentCommands,
} from "../scripts/deploy-hostinger.mjs";

const environment = {
  HOSTINGER_FTP_SERVER: "ftp.example.com",
  HOSTINGER_FTP_USERNAME: "site-account",
  HOSTINGER_FTP_PASSWORD: "test-only-not-a-real-credential",
  HOSTINGER_FTP_DIRECTORY: "/public_html/",
};

test("deployment fails before connecting when required secrets are absent", () => {
  assert.throws(
    () => deploymentConfig({}),
    /HOSTINGER_FTP_SERVER.*HOSTINGER_FTP_USERNAME.*HOSTINGER_FTP_PASSWORD.*HOSTINGER_FTP_DIRECTORY/,
  );
});

test("deployment validates hostnames, ports, and directory commands", () => {
  assert.equal(deploymentConfig(environment).port, 21);
  assert.equal(
    deploymentConfig({ ...environment, HOSTINGER_FTP_DIRECTORY: "/" })
      .directory,
    "/",
  );
  for (const directory of [
    "/public_html/; quit",
    "../public_html",
    "/../public_html/",
    "/public_html/\nbye",
  ]) {
    assert.throws(() =>
      deploymentConfig({ ...environment, HOSTINGER_FTP_DIRECTORY: directory }),
    );
  }
  assert.throws(() =>
    deploymentConfig({
      ...environment,
      HOSTINGER_FTP_SERVER: "ftp://ftp.example.com",
    }),
  );
  assert.throws(() =>
    deploymentConfig({ ...environment, HOSTINGER_FTP_PORT: "0" }),
  );
});

test("upload requires verified TLS and preserves existing hosting files", () => {
  const commands = deploymentCommands("/public_html/");
  assert.match(commands, /set ftp:ssl-force true/);
  assert.match(commands, /set ftp:ssl-protect-data true/);
  assert.match(commands, /set ssl:verify-certificate true/);
  assert.match(commands, /cd "\/public_html\/"/);
  assert.doesNotMatch(commands, /--delete|ssl:verify-certificate false/);
  assert.ok(!commands.includes(environment.HOSTINGER_FTP_PASSWORD));
});
