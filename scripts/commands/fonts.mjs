import { resolve } from "node:path";
import { readBlock, TokenBlockError } from "../lib/css-tokens.mjs";
import { FileGuardError, readInput, writeFileSafely } from "../lib/files.mjs";

const USAGE =
  'node scripts/crocotaste.mjs fonts <BRAND.html> "<Family:wght@400;600>" ...\n';

const CSS2 = "https://fonts.googleapis.com/css2";
const TIMEOUT_MS = 15_000;
// Google answers by user agent: only a current browser gets woff2 and the
// per-subset comments this command reads.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
// A family name, then Google's axis list (`ital,wght@0,400..700;1,400`): only
// letters, digits and the separators the css2 API reads ever reach the URL.
const FAMILY_ARG = /^[A-Za-z0-9 ]+(?::[A-Za-z]+(?:,[A-Za-z]+)*@[0-9.,;]+)?$/;
const FONT_HOST = "https://fonts.gstatic.com/";
const MAX_CSS_BYTES = 256 * 1024;
const MAX_FONT_BYTES = 2 * 1024 * 1024;
const FACE = /(?:\/\*\s*([\w-]+)\s*\*\/\s*)?(@font-face\s*\{[^}]*\})/g;
const SRC_URL =
  /url\(\s*(["']?)([^)"']+)\1\s*\)\s*format\(\s*(["'])woff2\3\s*\)/;

// A refusal names its reason; a plain failure only says the face is missing.
class FontRefusal extends Error {
  constructor(message) {
    super(message);
    this.name = "FontRefusal";
  }
}

function familyName(arg) {
  return arg.split(":")[0];
}

// Bytes are counted as they arrive, so a server cannot make us buffer more
// than the cap whatever its Content-Length says.
async function readCapped(response, cap, url) {
  const chunks = [];
  let total = 0;
  const reader = response.body?.getReader();
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > cap) {
        await reader.cancel().catch(() => {});
        throw new FontRefusal(`refusing ${url}: over ${cap / 1024} KB`);
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

// Subsets are the comments Google puts before each face; answer without any
// keeps every face rather than silently dropping them all.
async function fontFaceCss(css2, download, keepSubsets = ["latin"]) {
  const faces = [...css2.matchAll(FACE)].map((m) => ({
    subset: m[1],
    rule: m[2],
  }));
  // A face lands inside a <style> in the brand book; one that could close it
  // means the whole response is not to be trusted.
  if (faces.some((face) => face.rule.includes("<"))) {
    throw new FontRefusal("refusing a font face that contains <");
  }
  const labelled = faces.some((face) => face.subset);
  const kept = faces.filter(
    (face) => !labelled || keepSubsets.includes(face.subset)
  );
  const out = [];
  for (const { subset, rule } of kept) {
    const match = rule.match(SRC_URL);
    if (!match) continue;
    // Only the first url() is checked and inlined; a second would land in
    // the book as it came. CSS escapes could spell one past the count, and
    // Google writes none, so a backslash is refused outright.
    if (rule.includes("\\")) {
      throw new FontRefusal("refusing a font face with a backslash");
    }
    if ((rule.match(/url\s*\(/gi) ?? []).length > 1) {
      throw new FontRefusal("refusing a font face with more than one url()");
    }
    if (!match[2].startsWith(FONT_HOST)) {
      throw new FontRefusal(
        `refusing a font URL outside ${FONT_HOST}: ${match[2]}`
      );
    }
    const bytes = await download(match[2]);
    const data = Buffer.from(bytes).toString("base64");
    const inlined = rule.replace(
      SRC_URL,
      () => `url(data:font/woff2;base64,${data}) format('woff2')`
    );
    out.push(subset ? `/* ${subset} */\n${inlined}` : inlined);
  }
  return out.join("\n\n");
}

// The body is read before the timer is cleared, so a server that stalls
// mid-body is cut off too. A redirect is an error: only the two Google hosts
// are ever asked.
async function get(io, url, headers, as, cap) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await io.fetch(url, {
      headers,
      redirect: "error",
      signal: controller.signal,
    });
    if (response.status !== 200) {
      await response.body?.cancel().catch(() => {});
      throw new Error(`HTTP ${response.status}`);
    }
    const bytes = await readCapped(response, cap, url);
    return as === "text" ? new TextDecoder().decode(bytes) : bytes;
  } finally {
    clearTimeout(timer);
  }
}

async function run(args, io) {
  const [file, ...families] = args;
  if (
    !file ||
    families.length === 0 ||
    [file, ...families].some((arg) => arg.startsWith("--")) ||
    !families.every((arg) => FAMILY_ARG.test(arg))
  ) {
    io.stderr.write(`Usage: ${USAGE}`);
    return 2;
  }
  const path = resolve(io.cwd, file);
  let html;
  let block;
  try {
    html = readInput(path, file);
    block = readBlock(html, "fonts");
  } catch (error) {
    if (error instanceof FileGuardError) {
      io.stderr.write(`${error.message}\n`);
      return 2;
    }
    io.stderr.write(
      error instanceof TokenBlockError
        ? `${file}: ${error.message}\n`
        : `Cannot read ${file}\n`
    );
    return 1;
  }

  let bytes = 0;
  const download = async (url) => {
    const data = await get(io, url, { Accept: "*/*" }, "bytes", MAX_FONT_BYTES);
    bytes += data.length;
    return data;
  };
  const parts = [];
  let failed = false;
  for (const arg of families) {
    try {
      const url = `${CSS2}?family=${arg.replace(/ /g, "+")}&display=swap`;
      const text = await get(
        io,
        url,
        { "User-Agent": USER_AGENT, Accept: "text/css,*/*;q=0.1" },
        "text",
        MAX_CSS_BYTES
      );
      const css = await fontFaceCss(text, download);
      if (!css.includes("@font-face")) throw new Error("no faces");
      parts.push(css);
    } catch (error) {
      failed = true;
      if (error instanceof FontRefusal) {
        io.stderr.write(`fonts: ${error.message}\n`);
      }
      io.stderr.write(
        `fonts: could not fetch ${familyName(arg)}; keep the system fallback and say so in chapter 04\n`
      );
    }
  }
  // All or nothing: half a brand typeface is worse than the fallback.
  if (failed) return 2;

  const css = parts.join("\n\n");
  try {
    writeFileSafely(
      path,
      html.slice(0, block.start) + "\n" + css + "\n" + html.slice(block.end),
      file
    );
  } catch (error) {
    if (error instanceof FileGuardError) {
      io.stderr.write(`${error.message}\n`);
      return 2;
    }
    io.stderr.write(`Cannot write ${file}\n`);
    return 1;
  }
  const faces = (css.match(/@font-face/g) ?? []).length;
  io.stdout.write(`inlined ${faces} faces (${(bytes / 1024).toFixed(1)} KB)\n`);
  return 0;
}

export { FAMILY_ARG, fontFaceCss, run };
