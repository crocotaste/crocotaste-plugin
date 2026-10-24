import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { readBlock, TokenBlockError } from "../lib/css-tokens.mjs";

const USAGE = 'crocotaste fonts <BRAND.html> "<Family:wght@400;600>" ...\n';

const CSS2 = "https://fonts.googleapis.com/css2";
const TIMEOUT_MS = 15_000;
// Google answers by user agent: only a current browser gets woff2 and the
// per-subset comments this command reads.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const FAMILY_ARG = /^[A-Za-z0-9 +]+(:[a-z]+@[0-9;.]+)?$/;
const FACE = /(?:\/\*\s*([\w-]+)\s*\*\/\s*)?(@font-face\s*\{[^}]*\})/g;
const SRC_URL =
  /url\(\s*(["']?)([^)"']+)\1\s*\)\s*format\(\s*(["'])woff2\3\s*\)/;

function familyName(arg) {
  return arg.split(":")[0].replace(/\+/g, " ");
}

// Subsets are the comments Google puts before each face; answer without any
// keeps every face rather than silently dropping them all.
async function fontFaceCss(css2, download, keepSubsets = ["latin"]) {
  const faces = [...css2.matchAll(FACE)].map((m) => ({
    subset: m[1],
    rule: m[2],
  }));
  const labelled = faces.some((face) => face.subset);
  const kept = faces.filter(
    (face) => !labelled || keepSubsets.includes(face.subset)
  );
  const out = [];
  for (const { subset, rule } of kept) {
    const match = rule.match(SRC_URL);
    if (!match) continue;
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

async function get(io, url, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await io.fetch(url, {
      headers,
      signal: controller.signal,
    });
    if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
    return response;
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
    html = readFileSync(path, "utf8");
    block = readBlock(html, "fonts");
  } catch (error) {
    io.stderr.write(
      error instanceof TokenBlockError
        ? `${file}: ${error.message}\n`
        : `Cannot read ${file}\n`
    );
    return 1;
  }

  let bytes = 0;
  const download = async (url) => {
    const data = new Uint8Array(
      await (await get(io, url, { Accept: "*/*" })).arrayBuffer()
    );
    bytes += data.length;
    return data;
  };
  const parts = [];
  let failed = false;
  for (const arg of families) {
    try {
      const url = `${CSS2}?family=${arg.replace(/ /g, "+")}&display=swap`;
      const response = await get(io, url, {
        "User-Agent": USER_AGENT,
        Accept: "text/css,*/*;q=0.1",
      });
      const css = await fontFaceCss(await response.text(), download);
      if (!css.includes("@font-face")) throw new Error("no faces");
      parts.push(css);
    } catch {
      failed = true;
      io.stderr.write(
        `fonts: could not fetch ${familyName(arg)}; keep the system fallback and say so in chapter 04\n`
      );
    }
  }
  // All or nothing: half a brand typeface is worse than the fallback.
  if (failed) return 2;

  const css = parts.join("\n\n");
  writeFileSync(
    path,
    html.slice(0, block.start) + "\n" + css + "\n" + html.slice(block.end)
  );
  const faces = (css.match(/@font-face/g) ?? []).length;
  io.stdout.write(`inlined ${faces} faces (${(bytes / 1024).toFixed(1)} KB)\n`);
  return 0;
}

export { fontFaceCss, run };
