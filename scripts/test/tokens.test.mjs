import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../lib/cli.mjs";
import { splitDesignMd } from "../lib/design-md.mjs";

const fixtures = new URL("./fixtures/", import.meta.url);

function setup() {
  const dir = mkdtempSync(join(tmpdir(), "crocotaste-tokens-"));
  copyFileSync(new URL("brand-min.html", fixtures), join(dir, "BRAND.html"));
  return dir;
}

function capture(cwd) {
  const out = [];
  const err = [];
  return {
    io: {
      stdout: { write: (t) => out.push(t) },
      stderr: { write: (t) => err.push(t) },
      cwd,
    },
    out: () => out.join(""),
    err: () => err.join(""),
  };
}

test("writes a new DESIGN.md with the body skeleton", async () => {
  const dir = setup();
  const c = capture(dir);
  const code = await run(
    ["tokens", "BRAND.html", "DESIGN.md", "--write"],
    c.io
  );
  assert.equal(code, 0, c.err());
  const text = readFileSync(join(dir, "DESIGN.md"), "utf8");
  assert.ok(text.startsWith("---\nversion: alpha"));
  assert.ok(text.includes("name: Sample"));
  assert.ok(text.includes("## Decisions"));
  assert.match(
    c.out(),
    /^wrote DESIGN\.md \(\d+ colors, 8 spacing, 4 rounded, 6 typography, 2 components; kept 0 keys\)/
  );
});

test("merging keeps the Decisions body byte-for-byte and the extra key", async () => {
  const dir = setup();
  const path = join(dir, "DESIGN.md");
  const original = readFileSync(
    new URL("design-existing.md", fixtures),
    "utf8"
  );
  writeFileSync(path, original);
  const c = capture(dir);
  const code = await run(
    ["tokens", "BRAND.html", "DESIGN.md", "--write"],
    c.io
  );
  assert.equal(code, 0, c.err());
  const text = readFileSync(path, "utf8");
  assert.equal(splitDesignMd(text).body, splitDesignMd(original).body);
  assert.ok(splitDesignMd(text).frontmatter.includes("exception-chart-line"));
  assert.match(c.out(), /kept [1-9]\d* keys\)/);
  const again = capture(dir);
  await run(["tokens", "BRAND.html", "DESIGN.md", "--write"], again.io);
  assert.equal(readFileSync(path, "utf8"), text);
});

test("--print writes frontmatter to stdout and no file", async () => {
  const dir = setup();
  const c = capture(dir);
  const code = await run(
    ["tokens", "BRAND.html", "DESIGN.md", "--print"],
    c.io
  );
  assert.equal(code, 0);
  assert.ok(c.out().includes("version: alpha"));
  assert.throws(() => readFileSync(join(dir, "DESIGN.md")));
});

test("fails with 1 and lists missing required tokens", async () => {
  const dir = setup();
  const html = readFileSync(join(dir, "BRAND.html"), "utf8").replaceAll(
    "--color-focus: var(--color-primary);",
    ""
  );
  writeFileSync(join(dir, "BRAND.html"), html);
  const c = capture(dir);
  const code = await run(
    ["tokens", "BRAND.html", "DESIGN.md", "--write"],
    c.io
  );
  assert.equal(code, 1);
  assert.ok(c.err().includes("color-focus"));
});

test("fails with 1 on a DESIGN.md the yaml subset cannot read", async () => {
  const dir = setup();
  writeFileSync(
    join(dir, "DESIGN.md"),
    "---\nversion: alpha\nlist:\n  - a\n---\n"
  );
  const c = capture(dir);
  const code = await run(
    ["tokens", "BRAND.html", "DESIGN.md", "--write"],
    c.io
  );
  assert.equal(code, 1);
  assert.ok(c.err().includes("line 4"));
});

test("exits 2 on bad usage", async () => {
  const c = capture(setup());
  assert.equal(await run(["tokens", "BRAND.html"], c.io), 2);
  assert.ok(c.err().includes("crocotaste tokens <BRAND.html> <DESIGN.md>"));
});
