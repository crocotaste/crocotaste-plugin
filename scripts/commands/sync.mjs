import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { readBlock, TokenBlockError } from "../lib/css-tokens.mjs";
import {
  FileGuardError,
  readInput,
  refuseSymlink,
  writeFileSafely,
} from "../lib/files.mjs";

const USAGE = "node scripts/crocotaste.mjs sync <BRAND.html> <mockups dir>\n";

// Next to the plugin, never the user's cwd, so the index is the same wherever
// the command runs.
const INDEX_TEMPLATE = new URL(
  "../../skills/mockups/templates/index.html",
  import.meta.url
);

// Only an index this command wrote carries the marker, so a hand-written
// index.html in the same folder is never replaced.
const INDEX_MARKER = "<!-- crocotaste:index -->";

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" };

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// A screen's own markup is already escaped; decode first so it is not doubled.
function decode(text) {
  return text.replace(/&(amp|lt|gt|quot|#39);/g, (_, name) => ENTITIES[name]);
}

function replaceBlock(html, name, css) {
  const { start, end } = readBlock(html, name);
  return html.slice(0, start) + css + html.slice(end);
}

// Fonts are optional in a screen; tokens are what makes it a screen.
function fill(html, blocks) {
  const withTokens = replaceBlock(html, "tokens", blocks.tokens);
  try {
    return replaceBlock(withTokens, "fonts", blocks.fonts);
  } catch (error) {
    if (error instanceof TokenBlockError) return withTokens;
    throw error;
  }
}

function describe(html, file) {
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? file;
  // Quote-aware: a description may hold a raw ">" inside its attribute.
  const meta = [...html.matchAll(/<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)]
    .map((m) => m[0])
    .find((tag) => /\bname=(["'])description\1/i.test(tag));
  const description =
    meta?.match(/(?<![\w-])content=(["'])([\s\S]*?)\1/i)?.[2] ?? "";
  return {
    file,
    title: decode(title.trim().replace(/ · Mockup$/, "")),
    description: decode(description.trim()),
  };
}

function cardsOf(screens) {
  if (screens.length === 0) {
    return '<p class="empty">No screens yet.</p>';
  }
  const cards = screens.map(
    ({ file, title, description }) =>
      `<a class="screen" href="${escapeHtml(file)}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(description)}</span></a>`
  );
  return `<div class="grid">\n        ${cards.join("\n        ")}\n      </div>`;
}

function run(args, io) {
  if (args.length !== 2 || args.some((arg) => arg.startsWith("--"))) {
    io.stderr.write(`Usage: ${USAGE}`);
    return 2;
  }
  try {
    return syncAll(args, io);
  } catch (error) {
    if (!(error instanceof FileGuardError)) throw error;
    io.stderr.write(`${error.message}\n`);
    return 2;
  }
}

function syncAll(args, io) {
  const brandPath = resolve(io.cwd, args[0]);
  let blocks;
  try {
    const brand = readInput(brandPath, args[0]);
    blocks = { tokens: readBlock(brand, "tokens").css, fonts: "" };
    // A brand book without fonts markers simply has no fonts to copy.
    try {
      blocks.fonts = readBlock(brand, "fonts").css;
    } catch (error) {
      if (!(error instanceof TokenBlockError)) throw error;
    }
  } catch (error) {
    if (error instanceof FileGuardError) throw error;
    if (error instanceof TokenBlockError) {
      io.stderr.write(`${args[0]}: ${error.message}\n`);
    } else {
      io.stderr.write(`Cannot read ${args[0]}\n`);
    }
    return 1;
  }

  const dir = resolve(io.cwd, args[1]);
  refuseSymlink(dir, args[1]);
  mkdirSync(dir, { recursive: true });
  const indexPath = join(dir, "index.html");
  const indexShown = join(args[1], "index.html");
  refuseSymlink(indexPath, indexShown);
  if (
    existsSync(indexPath) &&
    !readInput(indexPath, indexShown).includes(INDEX_MARKER)
  ) {
    io.stderr.write(
      `refusing to overwrite ${indexShown}: not a mockups index\n`
    );
    return 2;
  }

  const entries = readdirSync(dir, { withFileTypes: true })
    .filter(
      (entry) => entry.name.endsWith(".html") && entry.name !== "index.html"
    )
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  // Every screen is read before any is written, so a refusal changes nothing.
  const pending = [];
  let skipped = 0;
  for (const entry of entries) {
    const file = entry.name;
    if (entry.isSymbolicLink()) {
      io.stderr.write(`skipped ${file}: symlink\n`);
      skipped += 1;
      continue;
    }
    if (!entry.isFile()) continue;
    const path = join(dir, file);
    const html = readInput(path, join(args[1], file));
    let next;
    try {
      next = fill(html, blocks);
    } catch (error) {
      if (!(error instanceof TokenBlockError)) throw error;
      io.stderr.write(`skipped ${file}: no tokens markers\n`);
      skipped += 1;
      continue;
    }
    pending.push({ file, path, html, next });
  }
  const screens = [];
  for (const { file, path, html, next } of pending) {
    if (next !== html) writeFileSafely(path, next, join(args[1], file));
    screens.push(describe(next, file));
  }

  const index = fill(readFileSync(INDEX_TEMPLATE, "utf8"), blocks).replace(
    "<!-- screens -->",
    () => cardsOf(screens)
  );
  writeFileSafely(indexPath, index, indexShown);
  io.stdout.write(
    `synced ${screens.length} ${screens.length === 1 ? "screen" : "screens"}, skipped ${skipped}, index rebuilt\n`
  );
  return 0;
}

export { run };
