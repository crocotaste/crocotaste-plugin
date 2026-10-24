import assert from "node:assert/strict";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkBrandBook, samplesOf } from "../scripts/commands/check.mjs";
import { run } from "../scripts/lib/cli.mjs";
import { CONTRAST_PAIRS } from "../scripts/lib/contrast.mjs";
import { readBlock } from "../scripts/lib/css-tokens.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BRAND_BOOK = join(ROOT, "skills/guidelines/templates/brand-book.html");
const DIRECTIONS = join(ROOT, "skills/branding/templates/directions.html");
const MOCKUP = join(ROOT, "skills/mockups/templates/mockup.html");
const SAMPLES = join(ROOT, "scripts/lib/template-samples.json");

const SPECIMENS = ["nav", "hero", "buttons", "input", "card", "row"];

function read(path) {
  return readFileSync(path, "utf8");
}

function quiet(cwd) {
  let out = "";
  let err = "";
  return {
    io: {
      stdout: { write: (text) => (out += text) },
      stderr: { write: (text) => (err += text) },
      cwd,
    },
    output: () => ({ out, err }),
  };
}

test("the brand book template passes check with no problems", () => {
  const html = read(BRAND_BOOK);
  assert.deepEqual(checkBrandBook(html).problems, []);
  // The page measures the same pairs check does.
  const pairs = html.match(/data-pairs="([^"]*)"/)[1];
  assert.equal(
    pairs,
    CONTRAST_PAIRS.map(({ fg, bg, min }) => `${fg}:${bg}:${min}`).join(",")
  );
});

test("the template's samples are listed and every data-fill is in the list", () => {
  const listed = JSON.parse(read(SAMPLES));
  const { samples, duplicates } = samplesOf(read(BRAND_BOOK));
  assert.deepEqual(duplicates, []);
  assert.ok(Object.keys(samples).length > 0, "the template has no data-fill");
  assert.deepEqual(listed, samples);
});

test("the template has no external request", () => {
  for (const path of [BRAND_BOOK, DIRECTIONS]) {
    const html = read(path).replace(/<!--[\s\S]*?-->/g, "");
    const links = html.match(/\b(?:src|href)=(["'])[^"']*\1/gi) ?? [];
    for (const link of links) {
      assert.ok(!/https?:/i.test(link), `${path}: ${link}`);
    }
    assert.ok(!/@import\b/i.test(html), `${path} has an @import`);
    assert.ok(!/url\(\s*["']?https?:/i.test(html), `${path} loads a url()`);
  }
});

test("the directions template has three direction sections and the specimen strip in each", () => {
  const html = read(DIRECTIONS);
  const sections = [
    ...html.matchAll(
      /<section\b[^>]*\bdata-direction="([A-C])"[^>]*>([\s\S]*?)<\/section>/g
    ),
  ];
  assert.deepEqual(
    sections.map((m) => m[1]),
    ["A", "B", "C"]
  );
  for (const [, letter, body] of sections) {
    assert.ok(
      new RegExp(`\\[data-direction="${letter}"\\]\\s*\\{`).test(html),
      `direction ${letter} has no scoped tokens`
    );
    assert.ok(
      /data-theme="dark"/.test(body),
      `direction ${letter} has no dark pocket`
    );
    for (const name of SPECIMENS) {
      const count = body.match(
        new RegExp(`data-specimen="${name}"`, "g")
      )?.length;
      assert.equal(count, 2, `direction ${letter}: ${name} in light and dark`);
    }
  }
});

test("the mockup template runs through sync with the brand book template", async () => {
  const dir = mkdtempSync(join(tmpdir(), "templates-"));
  const mockups = join(dir, "mockups");
  mkdirSync(mockups);
  copyFileSync(BRAND_BOOK, join(dir, "BRAND.html"));
  writeFileSync(join(mockups, "home.html"), read(MOCKUP));
  const { io } = quiet(dir);
  const code = await run(["sync", "BRAND.html", "mockups"], io);
  assert.equal(code, 0);
  const brand = read(BRAND_BOOK);
  for (const file of ["home.html", "index.html"]) {
    const html = read(join(mockups, file));
    assert.equal(readBlock(html, "tokens").css, readBlock(brand, "tokens").css);
  }
});
