import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../lib/cli.mjs";
import { readBlock } from "../lib/css-tokens.mjs";

const fixture = readFileSync(
  new URL("./fixtures/brand-min.html", import.meta.url),
  "utf8"
);
const template = readFileSync(
  new URL("../../skills/mockups/templates/mockup.html", import.meta.url),
  "utf8"
);

// A brand book whose primary differs from the template's placeholder, so a
// copied block is visible.
const brand = fixture
  .replace("--color-primary: #2456e6;", "--color-primary: #0a7d5a;")
  .replace(
    "<!-- fonts:start -->",
    "<!-- fonts:start -->\n@font-face { font-family: Inter; src: local(Inter); }"
  );

function setup() {
  const dir = mkdtempSync(join(tmpdir(), "sync-"));
  const brandPath = join(dir, "BRAND.html");
  const mockups = join(dir, "mockups");
  writeFileSync(brandPath, brand);
  return { dir, brandPath, mockups };
}

function screen(title, description) {
  return template
    .replace("Screen name · Mockup", `${title} · Mockup`)
    .replace('content=""', `content="${description}"`);
}

async function sync(dir, args) {
  let out = "";
  let err = "";
  const code = await run(["sync", ...args], {
    stdout: { write: (text) => (out += text) },
    stderr: { write: (text) => (err += text) },
    cwd: dir,
  });
  return { code, out, err };
}

test("replaces the tokens and fonts blocks in every screen", async () => {
  const { dir, brandPath, mockups } = setup();
  await sync(dir, [brandPath, mockups]);
  writeFileSync(join(mockups, "a.html"), screen("A", "first"));
  writeFileSync(join(mockups, "b.html"), screen("B", "second"));
  const result = await sync(dir, [brandPath, mockups]);
  assert.equal(result.code, 0);
  assert.equal(result.out, "synced 2 screens, skipped 0, index rebuilt\n");
  for (const file of ["a.html", "b.html", "index.html"]) {
    const html = readFileSync(join(mockups, file), "utf8");
    assert.equal(readBlock(html, "tokens").css, readBlock(brand, "tokens").css);
    assert.equal(readBlock(html, "fonts").css, readBlock(brand, "fonts").css);
  }
});

test("skips a file without markers, names it and leaves it untouched", async () => {
  const { dir, brandPath, mockups } = setup();
  await sync(dir, [brandPath, mockups]);
  const broken = "<html><body>no markers</body></html>";
  const backwards = "<!-- tokens:end --> x <!-- tokens:start -->";
  writeFileSync(join(mockups, "broken.html"), broken);
  writeFileSync(join(mockups, "backwards.html"), backwards);
  writeFileSync(join(mockups, "ok.html"), screen("Ok", ""));
  const result = await sync(dir, [brandPath, mockups]);
  assert.match(result.err, /skipped broken\.html: no tokens markers/);
  assert.match(result.err, /skipped backwards\.html: no tokens markers/);
  assert.equal(readFileSync(join(mockups, "broken.html"), "utf8"), broken);
  assert.equal(
    readFileSync(join(mockups, "backwards.html"), "utf8"),
    backwards
  );
  assert.equal(result.out, "synced 1 screens, skipped 2, index rebuilt\n");
  assert.equal(result.code, 0);
});

test("a screen with tokens markers but no fonts markers gets only its tokens", async () => {
  const { dir, brandPath, mockups } = setup();
  await sync(dir, [brandPath, mockups]);
  const noFonts = screen("N", "").replace(/<!-- fonts:(start|end) -->\n/g, "");
  writeFileSync(join(mockups, "n.html"), noFonts);
  const result = await sync(dir, [brandPath, mockups]);
  assert.equal(result.err, "");
  const html = readFileSync(join(mockups, "n.html"), "utf8");
  assert.equal(readBlock(html, "tokens").css, readBlock(brand, "tokens").css);
  assert.ok(!html.includes("fonts:start"));
});

test("rebuilds index.html with one card per screen in filename order", async () => {
  const { dir, brandPath, mockups } = setup();
  await sync(dir, [brandPath, mockups]);
  writeFileSync(join(mockups, "b.html"), screen("Beta & co", "the <second>"));
  writeFileSync(join(mockups, "a.html"), screen("Alpha", "first"));
  await sync(dir, [brandPath, mockups]);
  const index = readFileSync(join(mockups, "index.html"), "utf8");
  const cards = index.match(/<a class="screen"[\s\S]*?<\/a>/g);
  assert.deepEqual(cards, [
    '<a class="screen" href="a.html"><strong>Alpha</strong><span>first</span></a>',
    '<a class="screen" href="b.html"><strong>Beta &amp; co</strong><span>the &lt;second&gt;</span></a>',
  ]);
  assert.ok(!index.includes("<!-- screens -->"));
  assert.ok(!index.includes("No screens yet."));
});

test("an index with no screens says so", async () => {
  const { dir, brandPath, mockups } = setup();
  const result = await sync(dir, [brandPath, mockups]);
  assert.equal(result.out, "synced 0 screens, skipped 0, index rebuilt\n");
  const index = readFileSync(join(mockups, "index.html"), "utf8");
  assert.match(index, /No screens yet\./);
  assert.ok(!index.includes('class="screen"'));
});

test("the mockup template passes through sync unchanged except the blocks", async () => {
  const { dir, brandPath, mockups } = setup();
  await sync(dir, [brandPath, mockups]);
  writeFileSync(join(mockups, "t.html"), template);
  await sync(dir, [brandPath, mockups]);
  const html = readFileSync(join(mockups, "t.html"), "utf8");
  const strip = (text) =>
    ["fonts", "tokens"].reduce((acc, name) => {
      const { start, end } = readBlock(acc, name);
      return acc.slice(0, start) + acc.slice(end);
    }, text);
  assert.equal(strip(html), strip(template));
});

test("a second run changes nothing", async () => {
  const { dir, brandPath, mockups } = setup();
  await sync(dir, [brandPath, mockups]);
  writeFileSync(join(mockups, "a.html"), screen("A", "first"));
  await sync(dir, [brandPath, mockups]);
  const first = ["a.html", "index.html"].map((f) =>
    readFileSync(join(mockups, f), "utf8")
  );
  await sync(dir, [brandPath, mockups]);
  const second = ["a.html", "index.html"].map((f) =>
    readFileSync(join(mockups, f), "utf8")
  );
  assert.deepEqual(second, first);
});

test("creates a missing mockups dir and resolves paths from the cwd", async () => {
  const { dir } = setup();
  const result = await sync(dir, ["BRAND.html", "deep/mockups"]);
  assert.equal(result.code, 0);
  assert.ok(existsSync(join(dir, "deep", "mockups", "index.html")));
});

test("an unreadable brand book exits 1, wrong usage exits 2", async () => {
  const { dir, mockups } = setup();
  const missing = await sync(dir, [join(dir, "nope.html"), mockups]);
  assert.equal(missing.code, 1);
  assert.match(missing.err, /Cannot read/);
  writeFileSync(join(dir, "bare.html"), "<html></html>");
  const bare = await sync(dir, [join(dir, "bare.html"), mockups]);
  assert.equal(bare.code, 1);
  assert.match(bare.err, /Missing marker/);
  assert.equal((await sync(dir, [])).code, 2);
  assert.equal((await sync(dir, ["a", "b", "c"])).code, 2);
  assert.ok(!existsSync(mockups));
});
