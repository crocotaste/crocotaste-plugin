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

function isFile(file) {
  return existsSync(join(ROOT, file)) && statSync(join(ROOT, file)).isFile();
}

// Every markdown file people or agents read as copy: the root docs, the skills
// and the eval cases.
function proseFiles() {
  return committableFiles(ROOT).filter(
    (file) =>
      isFile(file) &&
      file.endsWith(".md") &&
      (!file.includes("/") ||
        file.startsWith("skills/") ||
        file.startsWith("evals/"))
  );
}

function templateFiles() {
  return committableFiles(ROOT).filter(
    (file) =>
      isFile(file) && /^skills\/[^/]+\/templates\/[^/]+\.html$/.test(file)
  );
}

// What a reader sees: no style, no script, no comments, no tags.
function visibleText(html) {
  return html
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]*>/g, " ");
}

function hasExclamation(text) {
  return /!(?![[=]|important)/.test(text);
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
    // An HTML comment opener is markup, not punctuation: handoff's block markers.
    const text = prose(readFileSync(join(ROOT, file), "utf8")).replaceAll(
      "<!--",
      ""
    );
    assert.ok(!hasExclamation(text), `${file} has an exclamation mark`);
  }
});

test("no exclamation mark in the visible text of the html templates", () => {
  const files = templateFiles();
  assert.ok(files.length >= 3, "the html templates were not found");
  for (const file of files) {
    const text = visibleText(readFileSync(join(ROOT, file), "utf8"));
    assert.ok(!hasExclamation(text), `${file} has an exclamation mark`);
  }
});

test("the voice check sees an exclamation mark in copy but not in markup", () => {
  assert.ok(hasExclamation(visibleText("<p>Done!</p>")));
  assert.ok(
    !hasExclamation(
      visibleText(
        "<!DOCTYPE html><!-- note! --><style>a { color: red !important; }</style><script>if (!a) b();</script><p>Done.</p>"
      )
    )
  );
});
