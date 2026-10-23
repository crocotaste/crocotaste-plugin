import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { readBlock, TokenBlockError } from "../lib/css-tokens.mjs";

const USAGE = "crocotaste sync <BRAND.html> <mockups dir>\n";

// Next to the plugin, never the user's cwd, so the index is the same wherever
// the command runs.
const INDEX_TEMPLATE = new URL(
  "../../skills/mockups/templates/index.html",
  import.meta.url
);

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
  const description = meta?.match(/\bcontent=(["'])([\s\S]*?)\1/i)?.[2] ?? "";
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
  const brandPath = resolve(io.cwd, args[0]);
  let blocks;
  try {
    const brand = readFileSync(brandPath, "utf8");
    blocks = {
      tokens: readBlock(brand, "tokens").css,
      fonts: readBlock(brand, "fonts").css,
    };
  } catch (error) {
    if (error instanceof TokenBlockError) {
      io.stderr.write(`${args[0]}: ${error.message}\n`);
    } else {
      io.stderr.write(`Cannot read ${args[0]}\n`);
    }
    return 1;
  }

  const dir = resolve(io.cwd, args[1]);
  mkdirSync(dir, { recursive: true });
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".html") && name !== "index.html")
    .sort();
  const screens = [];
  let skipped = 0;
  for (const file of files) {
    const path = join(dir, file);
    const html = readFileSync(path, "utf8");
    let next;
    try {
      next = fill(html, blocks);
    } catch (error) {
      if (!(error instanceof TokenBlockError)) throw error;
      io.stderr.write(`skipped ${file}: no tokens markers\n`);
      skipped += 1;
      continue;
    }
    if (next !== html) writeFileSync(path, next);
    screens.push(describe(next, file));
  }

  const index = fill(readFileSync(INDEX_TEMPLATE, "utf8"), blocks).replace(
    "<!-- screens -->",
    () => cardsOf(screens)
  );
  writeFileSync(join(dir, "index.html"), index);
  io.stdout.write(
    `synced ${screens.length} screens, skipped ${skipped}, index rebuilt\n`
  );
  return 0;
}

export { run };
