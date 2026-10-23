import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { committableFiles } from "./guards.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TEXT = new Set([
  ".md",
  ".html",
  ".mjs",
  ".js",
  ".json",
  ".yml",
  ".yaml",
  ".txt",
  ".css",
]);

// Built from its code point so this file never contains the character.
const EM_DASH = String.fromCharCode(0x2014);

function prose(text) {
  let fenced = false;
  return text
    .split("\n")
    .filter((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        fenced = !fenced;
        return false;
      }
      return !fenced;
    })
    .join("\n");
}

function proseFiles() {
  return committableFiles(ROOT).filter(
    (file) =>
      existsSync(join(ROOT, file)) &&
      statSync(join(ROOT, file)).isFile() &&
      (file === "README.md" ||
        (file.startsWith("skills/") && file.endsWith(".md")))
  );
}

test("no em dash in any text file", () => {
  for (const file of committableFiles(ROOT)) {
    if (!existsSync(join(ROOT, file)) || !TEXT.has(extname(file))) continue;
    const text = readFileSync(join(ROOT, file), "utf8");
    assert.ok(!text.includes(EM_DASH), `${file} has an em dash`);
  }
});

test("no exclamation mark in prose", () => {
  for (const file of proseFiles()) {
    const text = prose(readFileSync(join(ROOT, file), "utf8"));
    assert.ok(!/!(?![[=])/.test(text), `${file} has an exclamation mark`);
  }
});
