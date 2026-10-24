import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../lib/cli.mjs";
import { FAMILY_ARG, fontFaceCss } from "../commands/fonts.mjs";
import { readBlock } from "../lib/css-tokens.mjs";

const css2 = readFileSync(
  new URL("./fixtures/fonts-css2.txt", import.meta.url),
  "utf8"
);
const brand = readFileSync(
  new URL("./fixtures/brand-min.html", import.meta.url),
  "utf8"
);
const BYTES = new Uint8Array([1, 2, 3, 4]);
const B64 = Buffer.from(BYTES).toString("base64");

function fakeFetch(status = 200, calls = []) {
  return async (url, init) => {
    calls.push({ url: String(url), init });
    if (status !== 200) return new Response("nope", { status });
    if (String(url).includes("googleapis.com")) {
      // One family's faces, as Google answers per request.
      const name = String(url).match(/family=([A-Za-z]+)/)[1];
      const faces = css2
        .split("\n\n")
        .filter((block) => block.includes(`font-family: '${name}'`));
      return new Response(faces.join("\n\n"), { status: 200 });
    }
    return new Response(BYTES, { status: 200 });
  };
}

function setup() {
  const dir = mkdtempSync(join(tmpdir(), "fonts-"));
  writeFileSync(join(dir, "BRAND.html"), brand);
  return dir;
}

function io(dir, fetch) {
  let out = "";
  let err = "";
  return {
    stdout: { write: (s) => (out += s) },
    stderr: { write: (s) => (err += s) },
    cwd: dir,
    fetch,
    get out() {
      return out;
    },
    get err() {
      return err;
    },
  };
}

test("keeps only the latin subset and inlines each src as base64", async () => {
  const urls = [];
  const css = await fontFaceCss(css2, async (url) => {
    urls.push(url);
    return BYTES;
  });
  assert.equal((css.match(/@font-face/g) ?? []).length, 3);
  assert.ok(!css.includes("latin-ext"));
  assert.equal(urls.length, 3);
  assert.equal(
    css.match(new RegExp(`url\\(data:font/woff2;base64,${B64}\\)`, "g")).length,
    3
  );
  assert.ok(!css.includes("gstatic"));
  assert.ok(css.startsWith("/* latin */\n@font-face"));
});

test("a response without subset comments keeps every block", async () => {
  const bare = css2.replace(/\/\* [\w-]+ \*\/\n/g, "");
  const css = await fontFaceCss(bare, async () => BYTES);
  assert.equal((css.match(/@font-face/g) ?? []).length, 6);
});

test("writes between the fonts markers and reports the size", async () => {
  const dir = setup();
  const calls = [];
  const sandbox = io(dir, fakeFetch(200, calls));
  const code = await run(
    ["fonts", "BRAND.html", "Inter:wght@400;600", "Fraunces:wght@500"],
    sandbox
  );
  assert.equal(code, 0);
  assert.equal(sandbox.out, "inlined 3 faces (0.0 KB)\n");
  const html = readFileSync(join(dir, "BRAND.html"), "utf8");
  const { css, start, end } = readBlock(html, "fonts");
  assert.ok(css.startsWith("\n/* latin */\n@font-face"));
  assert.ok(css.endsWith("\n"));
  assert.equal(html.slice(0, start), brand.slice(0, start));
  assert.equal(html.slice(end), brand.slice(readBlock(brand, "fonts").end));
  const first = calls[0];
  assert.equal(
    first.url,
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap"
  );
  assert.match(first.init.headers["User-Agent"], /Chrome\/130/);
  const downloads = calls.filter((c) => c.url.includes("gstatic"));
  assert.equal(downloads.length, 3);
  assert.ok(downloads.every((c) => !("User-Agent" in c.init.headers)));
});

test("running twice leaves the same file with one set of faces", async () => {
  const dir = setup();
  const args = ["fonts", "BRAND.html", "Inter:wght@400;600"];
  assert.equal(await run(args, io(dir, fakeFetch())), 0);
  const once = readFileSync(join(dir, "BRAND.html"), "utf8");
  assert.equal(await run(args, io(dir, fakeFetch())), 0);
  const twice = readFileSync(join(dir, "BRAND.html"), "utf8");
  assert.equal(twice, once);
  assert.equal(twice.match(/@font-face/g).length, 2);
});

test("returns 2 and leaves the file untouched on a failed fetch", async () => {
  const dir = setup();
  const sandbox = io(dir, fakeFetch(404));
  const code = await run(["fonts", "BRAND.html", "Inter:wght@400"], sandbox);
  assert.equal(code, 2);
  assert.equal(
    sandbox.err,
    "fonts: could not fetch Inter; keep the system fallback and say so in chapter 04\n"
  );
  assert.equal(readFileSync(join(dir, "BRAND.html"), "utf8"), brand);
});

test("a thrown fetch also leaves the file untouched", async () => {
  const dir = setup();
  const sandbox = io(dir, async () => {
    throw new Error("offline");
  });
  assert.equal(await run(["fonts", "BRAND.html", "Inter"], sandbox), 2);
  assert.equal(readFileSync(join(dir, "BRAND.html"), "utf8"), brand);
});

test("rejects a malformed family argument with 2 before any request", async () => {
  const dir = setup();
  const calls = [];
  const sandbox = io(dir, fakeFetch(200, calls));
  const code = await run(["fonts", "BRAND.html", "Inter&evil=1"], sandbox);
  assert.equal(code, 2);
  assert.equal(calls.length, 0);
});

test("returns 1 for a missing book or missing fonts markers", async () => {
  const dir = setup();
  const sandbox = io(dir, fakeFetch());
  assert.equal(await run(["fonts", "nope.html", "Inter"], sandbox), 1);
  writeFileSync(join(dir, "bare.html"), "<html></html>");
  assert.equal(
    await run(["fonts", "bare.html", "Inter"], io(dir, fakeFetch())),
    1
  );
});

test("a response with a font URL outside fonts.gstatic.com is refused", async () => {
  const dir = setup();
  const calls = [];
  const sandbox = io(dir, async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(
      css2.replaceAll("https://fonts.gstatic.com/", "https://evil.example/"),
      { status: 200 }
    );
  });
  assert.equal(await run(["fonts", "BRAND.html", "Inter"], sandbox), 2);
  assert.match(
    sandbox.err,
    /refusing a font URL outside https:\/\/fonts\.gstatic\.com\//
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.redirect, "error");
  assert.equal(readFileSync(join(dir, "BRAND.html"), "utf8"), brand);
});

test("a face with < in its text is refused", async () => {
  const evil = css2.replace(
    "font-display: swap;",
    "font-display: swap; font-family: 'x</style><script>alert(1)</script>';"
  );
  await assert.rejects(
    fontFaceCss(evil, async () => BYTES),
    /refusing a font face that contains </
  );
});

test("an over-cap body is refused", async () => {
  const dir = setup();
  const sandbox = io(dir, async (url) =>
    String(url).includes("googleapis.com")
      ? new Response(css2, { status: 200 })
      : new Response(new Uint8Array(2 * 1024 * 1024 + 1), { status: 200 })
  );
  assert.equal(await run(["fonts", "BRAND.html", "Inter"], sandbox), 2);
  assert.match(sandbox.err, /over 2048 KB/);
  assert.equal(readFileSync(join(dir, "BRAND.html"), "utf8"), brand);
  const big = io(
    dir,
    async () => new Response("a".repeat(256 * 1024 + 1), { status: 200 })
  );
  assert.equal(await run(["fonts", "BRAND.html", "Inter"], big), 2);
  assert.match(big.err, /over 256 KB/);
});

test("FAMILY_ARG accepts Google's axis forms and rejects anything else", () => {
  for (const arg of [
    "Inter",
    "IBM Plex Sans:wght@400;600",
    "Inter:wght@400..700",
    "Lora:ital,wght@0,400..700;1,400",
    "Roboto Flex:opsz,wght@8..144,100..1000",
  ]) {
    assert.ok(FAMILY_ARG.test(arg), arg);
  }
  for (const arg of ["Inter&evil=1", "Inter+Sans", 'Inter"', "Inter:wght@4<"]) {
    assert.ok(!FAMILY_ARG.test(arg), arg);
  }
});
