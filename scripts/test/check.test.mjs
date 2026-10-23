import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../lib/cli.mjs";
import { checkBrandBook } from "../commands/check.mjs";

const html = readFileSync(
  new URL("./fixtures/brand-min.html", import.meta.url),
  "utf8"
);

function named(result, text) {
  return result.problems.some((problem) => problem.includes(text));
}

test("a complete minimal brand book has no problems", () => {
  const result = checkBrandBook(html);
  assert.deepEqual(result.problems, []);
  assert.deepEqual(result.notes, ["fonts: not inlined"]);
});

test("a missing chapter, a chapter out of order and a missing sidebar link are named", () => {
  const noType = html.replace(
    '<section id="typography" data-chapter></section>',
    ""
  );
  assert.ok(named(checkBrandBook(noType), "chapter typography: missing"));
  assert.equal(
    checkBrandBook(noType).problems.filter((p) => p.startsWith("chapter "))
      .length,
    1
  );

  const swapped = html
    .replace(
      '<section id="spacing" data-chapter>',
      '<section id="X" data-chapter>'
    )
    .replace(
      '<section id="iconography" data-chapter>',
      '<section id="spacing" data-chapter>'
    )
    .replace(
      '<section id="X" data-chapter>',
      '<section id="iconography" data-chapter>'
    );
  assert.ok(
    named(
      checkBrandBook(swapped),
      "chapter spacing: out of order (expected position 5)"
    )
  );

  const noLink = html.replace('<a href="#motion">Motion</a>', "");
  assert.ok(named(checkBrandBook(noLink), "sidebar: no link to #motion"));
});

test("a missing required token and an unparsable color are named", () => {
  const noRadius = html.replace("--radius-md: 8px;", "");
  assert.ok(named(checkBrandBook(noRadius), "radius-md: missing in light"));

  const bad = html.replace(
    "--color-primary: #2456e6;",
    "--color-primary: var(--nope);"
  );
  const result = checkBrandBook(bad);
  assert.ok(named(result, "color-primary: unparsable value var(--nope)"));
});

test("a failing contrast pair is reported with both ratios", () => {
  const weak = html
    .replace("--color-text: #16181d;", "--color-text: #777777;")
    .replace("--color-surface: #f6f7f9;", "--color-surface: #ffffff;");
  assert.ok(named(checkBrandBook(weak), "4.47:1, needs 4.5:1"));
  assert.ok(named(checkBrandBook(weak), "color-text on color-surface (light)"));
});

test("a translucent text color is composited and the scrim is not checked", () => {
  const faint = html.replace(
    "--color-text-muted: #5a6270;",
    "--color-text-muted: rgba(0,0,0,0.3);"
  );
  assert.ok(named(checkBrandBook(faint), "color-text-muted on color-surface"));
  assert.deepEqual(checkBrandBook(html).problems, []);
});

test("a button without a loading state is named", () => {
  const result = checkBrandBook(
    html.replace('<span data-state="loading"></span>', "")
  );
  assert.ok(named(result, "button-primary: missing state loading"));
});

test("--json prints the object and returns 1 on problems", async () => {
  const dir = mkdtempSync(join(tmpdir(), "crocotaste-check-"));
  writeFileSync(
    join(dir, "BRAND.html"),
    html.replace("<title>", "<x>").replace("</title>", "</x>")
  );
  const out = [];
  const io = {
    stdout: { write: (t) => out.push(t) },
    stderr: { write() {} },
    cwd: dir,
  };
  assert.equal(await run(["check", "BRAND.html", "--json"], io), 1);
  const parsed = JSON.parse(out.join(""));
  assert.deepEqual(Object.keys(parsed), ["problems", "notes"]);
  assert.ok(parsed.problems.includes("title: not set"));
});

test("plain output ends with a count line, and a missing file is a usage error", async () => {
  const dir = mkdtempSync(join(tmpdir(), "crocotaste-check-"));
  writeFileSync(join(dir, "BRAND.html"), html);
  const out = [];
  const err = [];
  const io = {
    stdout: { write: (t) => out.push(t) },
    stderr: { write: (t) => err.push(t) },
    cwd: dir,
  };
  assert.equal(await run(["check", "BRAND.html"], io), 0);
  assert.match(
    out.join(""),
    /note: fonts: not inlined\n0 problems, 1 notes\n$/
  );
  assert.equal(await run(["check", "nope.html"], io), 2);
  assert.equal(await run(["check"], io), 2);
});

test("a failing pair in dark, an unparsable scrim, a missing component and a missing fonts marker", () => {
  const dark = html.replace("--color-text: #f2f4f7;", "--color-text: #555555;");
  assert.ok(named(checkBrandBook(dark), "color-text on color-surface (dark)"));

  const scrim = checkBrandBook(
    html.replace(
      "--color-scrim: rgba(0,0,0,0.5);",
      "--color-scrim: var(--nope);"
    )
  );
  assert.ok(named(scrim, "color-scrim: unparsable value var(--nope)"));
  assert.ok(!named(scrim, "color-scrim on"));

  const noToast = html.replace('<div data-component="toast"></div>', "");
  assert.ok(named(checkBrandBook(noToast), "toast: missing component"));

  const noFonts = html.replace("<!-- fonts:end -->", "");
  assert.ok(named(checkBrandBook(noFonts), "fonts: missing"));
});

test("states count only inside the component, ids need a word edge", () => {
  const outside = html.replace(
    '<span data-state="loading"></span></div>',
    '</div><span data-state="loading"></span>'
  );
  assert.ok(
    named(checkBrandBook(outside), "button-primary: missing state loading")
  );

  const dataId = html.replace(
    '<section id="mark" data-chapter>',
    '<section data-id="mark" data-chapter>'
  );
  assert.ok(named(checkBrandBook(dataId), "chapter mark: missing"));
});
