import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { MAX_BYTES, committableFiles, scanPath, scanText } from "./guards.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// Samples are built from parts so this file never contains a match itself.
const dashes = "-".repeat(5);
const home = (prefix) => prefix + "someone/x";

test("flags a private key block", () => {
  const problems = scanText("a.txt", `${dashes}BEGIN RSA PRIVATE KEY${dashes}`);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /private key/i);
});

test("flags common token formats", () => {
  const samples = [
    "ghp_" + "x".repeat(36),
    "sk-ant-" + "a".repeat(20),
    "AKIA" + "A".repeat(16),
    "xoxb-" + "1234567890",
  ];
  for (const sample of samples) {
    assert.ok(scanText("a.txt", `token ${sample}`).length >= 1, sample);
  }
});

test("flags a home folder path", () => {
  for (const sample of [
    home("/Us" + "ers/"),
    home("/ho" + "me/"),
    "C:\\Us" + "ers\\someone\\x",
  ]) {
    assert.ok(scanText("a.txt", sample).length >= 1, sample);
  }
});

test("flags AI attribution", () => {
  const trailer = "Co-Authored-By: ";
  const made = "Generated with ";
  const lower = "Co-authored-by: ";
  const samples = [
    trailer + "Cla" + "ude",
    made + "Cla" + "ude Code",
    lower + "Chat" + "GPT",
  ];
  for (const sample of samples) {
    assert.ok(scanText("a.txt", sample).length >= 1, sample);
  }
});

test("flags a postgres url with a real password on a real host", () => {
  const url = "postgres://user:" + "p".repeat(12) + "@db.example.com/app";
  assert.ok(scanText("a.txt", url).length >= 1);
});

test("passes localhost URLs and placeholders", () => {
  for (const sample of [
    "http://127.0.0.1:3000",
    "postgres://u:p@localhost/db",
    "sk-ant-xxx",
  ]) {
    assert.deepEqual(scanText("a.txt", sample), [], sample);
  }
});

// Built by concatenation so a template placeholder is not read as a password.
const url = (password, host) =>
  "postgres://u:" + password + "@" + host + "/app";

test("passes localhost and db hosts even with a long password", () => {
  const password = "p".repeat(12);
  for (const host of ["localhost", "db"]) {
    assert.deepEqual(scanText("a.txt", url(password, host)), []);
  }
  assert.ok(scanText("a.txt", url(password, "db.example.com")).length >= 1);
});

test("flags more token shapes and passes a short database password", () => {
  for (const sample of [
    "github_pat_" + "A".repeat(40),
    "gho_" + "x".repeat(36),
    "sk-" + "a".repeat(32),
  ]) {
    assert.ok(scanText("a.txt", sample).length >= 1, sample);
  }
  assert.deepEqual(scanText("a.txt", "sk-" + "a".repeat(31)), []);
  assert.deepEqual(
    scanText("a.txt", "postgres://u:" + "p".repeat(8) + "@db.example.com/app"),
    []
  );
});

test("every committable file passes and is under 1 MB", () => {
  for (const file of committableFiles(ROOT)) {
    const path = join(ROOT, file);
    if (!existsSync(path)) continue;
    const content = readFileSync(path);
    assert.ok(content.length < MAX_BYTES, `${file} is ${content.length} bytes`);
    if (content.subarray(0, 8192).includes(0)) continue;
    assert.deepEqual(scanText(file, content.toString("utf8")), []);
  }
});

test("flags the agent footer and an AI trailer by its address", () => {
  const made = "Generated ";
  const samples = [
    made + "with [Cla" + "ude Code](https://example.com)",
    made + "by [Cur" + "sor](https://example.com)",
    made + "with (Co" + "dex)",
    "Co-Authored-By: Someone <noreply@" + "anthro" + "pic.com>",
    "Co-authored-by: A Bot <bot@" + "open" + "ai.com>",
  ];
  for (const sample of samples) {
    assert.ok(scanText("a.txt", sample).length >= 1, sample);
  }
  assert.deepEqual(
    scanText("a.txt", "Co-Authored-By: A Person <a@example.com>"),
    []
  );
});

test("flags the newer token shapes", () => {
  const samples = [
    "gh" + "s_" + "a".repeat(36),
    "gh" + "u_" + "a".repeat(36),
    "gh" + "r_" + "a".repeat(36),
    "sk-" + "proj-" + "a".repeat(20),
    "AI" + "za" + "a".repeat(35),
    "sk" + "_live_" + "a".repeat(20),
    "rk" + "_live_" + "a".repeat(20),
    "np" + "m_" + "a".repeat(36),
    "AS" + "IA" + "A".repeat(16),
    "gl" + "pat-" + "a".repeat(20),
    "xo" + "xe-" + "1234567890",
    "xo" + "xs-" + "1234567890",
    "my" + "sql://user:" + "secret@db.example.com/app",
    "mon" + "godb://user:" + "secret@db.example.com/app",
    "mon" + "godb+srv://user:" + "secret@cluster.example.com/app",
  ];
  for (const sample of samples) {
    assert.ok(scanText("a.txt", `value ${sample}`).length >= 1, sample);
  }
});

test("a committed .env file is a finding, the example is not", () => {
  const env = "." + "env";
  for (const path of [
    env,
    `${env}.local`,
    `app/${env}`,
    `app/${env}.production`,
  ]) {
    assert.equal(scanPath(path).length, 1, path);
  }
  for (const path of [
    `${env}.example`,
    `app/${env}.example`,
    "envelope.txt",
    `docs/${env}rc`,
  ]) {
    assert.deepEqual(scanPath(path), [], path);
  }
  for (const file of committableFiles(ROOT)) {
    assert.deepEqual(scanPath(file), [], file);
  }
});

const CLI = join(ROOT, "checks", "guards.mjs");

function run(args, cwd = ROOT) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });
}

function message(text) {
  const dir = mkdtempSync(join(tmpdir(), "guards-"));
  const file = join(dir, "MSG");
  writeFileSync(file, text);
  return file;
}

test("--message accepts a conventional commit and refuses the rest", () => {
  assert.equal(run(["--message", message("feat(scripts): x\n")]).status, 0);
  assert.equal(run(["--message", message("bad message\n")]).status, 1);
  const trailer = "Co-Authored-By: ";
  const attributed = `feat: x\n\n${trailer}` + "Cla" + "ude <a@b.c>\n";
  assert.equal(run(["--message", message(attributed)]).status, 1);
});

test("--message ignores # comment lines", () => {
  const trailer = "Co-Authored-By: ";
  const text = `feat: x\n# ${trailer}` + "Cla" + "ude\n";
  assert.equal(run(["--message", message(text)]).status, 0);
});

test("the cli exits 2 without a known mode", () => {
  assert.equal(run([]).status, 2);
  assert.equal(run(["--message"]).status, 2);
});

test("--staged scans the index of a repository", () => {
  const repo = mkdtempSync(join(tmpdir(), "guards-repo-"));
  const git = (...args) => execFileSync("git", args, { cwd: repo });
  git("init", "-q");
  writeFileSync(join(repo, "ok.txt"), "nothing here\n");
  git("add", "ok.txt");
  assert.equal(run(["--staged"], repo).status, 0);
  writeFileSync(join(repo, "bad.txt"), "ghp_" + "x".repeat(36) + "\n");
  git("add", "bad.txt");
  assert.equal(run(["--staged"], repo).status, 1);
});

test("--staged refuses a file over 1 MB", () => {
  const repo = mkdtempSync(join(tmpdir(), "guards-big-"));
  execFileSync("git", ["init", "-q"], { cwd: repo });
  writeFileSync(join(repo, "big.txt"), "a".repeat(MAX_BYTES + 1));
  execFileSync("git", ["add", "big.txt"], { cwd: repo });
  assert.equal(run(["--staged"], repo).status, 1);
});

test("--staged refuses a staged .env file", () => {
  const repo = mkdtempSync(join(tmpdir(), "guards-env-"));
  execFileSync("git", ["init", "-q"], { cwd: repo });
  const env = "." + "env";
  writeFileSync(join(repo, env), "NAME=value\n");
  execFileSync("git", ["add", "-f", env], { cwd: repo });
  assert.equal(run(["--staged"], repo).status, 1);
});
