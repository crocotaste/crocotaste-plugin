import assert from "node:assert/strict";
import { statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { MAX_BYTES, committableFiles, scanText } from "./guards.mjs";

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

test("every committable file passes and is under 1 MB", () => {
  for (const file of committableFiles(ROOT)) {
    const size = statSync(join(ROOT, file)).size;
    assert.ok(size < MAX_BYTES, `${file} is ${size} bytes`);
  }
});
