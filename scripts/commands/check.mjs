import { existsSync, readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CONTRAST_PAIRS, contrastRatio } from "../lib/contrast.mjs";
import {
  parseColor,
  parseTokens,
  readBlock,
  readTokenBlock,
  REQUIRED_TOKENS,
  TokenBlockError,
} from "../lib/css-tokens.mjs";

const USAGE =
  "crocotaste check <BRAND.html> [--json]\n       crocotaste check --samples <file>\n";

// The template's own copy, listed so a brand book that still carries it is
// caught. Next to the plugin, never the user's cwd.
const SAMPLES = new URL("../lib/template-samples.json", import.meta.url);
const TEMPLATE = new URL(
  "../../skills/guidelines/templates/brand-book.html",
  import.meta.url
);

const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  nbsp: " ",
};

const CHAPTERS = [
  "foundations",
  "mark",
  "color",
  "typography",
  "spacing",
  "iconography",
  "components",
  "motion",
  "voice",
  "responsive",
];

const REQUIRED_COMPONENTS = [
  "button-primary",
  "button-secondary",
  "button-ghost",
  "input",
  "select",
  "checkbox",
  "switch",
  "card",
  "table",
  "tabs",
  "dialog",
  "toast",
  "empty-state",
  "nav",
];

const SHARED_STATES = ["default", "hover", "active", "focus", "disabled"];
const REQUIRED_STATES = {
  "button-primary": [...SHARED_STATES, "loading"],
  input: [...SHARED_STATES, "error"],
};

const THEMES = ["light", "dark"];

function attribute(tag, name) {
  const match = tag.match(new RegExp(`(?<![\\w-])${name}=(["'])(.*?)\\1`, "i"));
  return match?.[2];
}

function ratioText(value) {
  return `${(Math.floor(value * 100) / 100).toFixed(2)}:1`;
}

function chapterRules(html) {
  const problems = [];
  const found = [];
  for (const tag of html.match(/<section\b[^>]*>/gi) ?? []) {
    if (/\bdata-chapter\b/i.test(tag)) found.push(attribute(tag, "id"));
  }
  // Order is judged among the chapters present, so one gap is one problem.
  const presentInOrder = CHAPTERS.filter((id) => found.includes(id));
  const foundKnown = found.filter((id) => CHAPTERS.includes(id));
  CHAPTERS.forEach((id, index) => {
    if (!found.includes(id)) problems.push(`chapter ${id}: missing`);
    else if (foundKnown[presentInOrder.indexOf(id)] !== id) {
      problems.push(
        `chapter ${id}: out of order (expected position ${index + 1})`
      );
    }
  });
  const nav = html.match(/<nav\b[^>]*\bdata-sidebar\b[^>]*>([\s\S]*?)<\/nav>/i);
  if (!nav) {
    problems.push("sidebar: missing <nav data-sidebar>");
  } else {
    const links = (nav[1].match(/<a\b[^>]*>/gi) ?? []).map((a) =>
      attribute(a, "href")
    );
    for (const id of CHAPTERS) {
      if (!links.includes(`#${id}`))
        problems.push(`sidebar: no link to #${id}`);
    }
  }
  return { problems, notes: [] };
}

function tokenRules(html) {
  let tokens;
  try {
    tokens = parseTokens(readTokenBlock(html).css);
  } catch (error) {
    if (!(error instanceof TokenBlockError)) throw error;
    return { problems: [`tokens: ${error.message}`], notes: [] };
  }
  const problems = [];
  for (const theme of THEMES) {
    const map = tokens[theme];
    // Dark overrides colors only; every other token falls through the cascade.
    for (const name of REQUIRED_TOKENS) {
      if (theme === "dark" && !name.startsWith("color-")) continue;
      if (!map.has(name)) problems.push(`${name}: missing in ${theme}`);
    }
    for (const [name, value] of map) {
      if (name.startsWith("color-") && !parseColor(value)) {
        problems.push(`${name}: unparsable value ${value} (${theme})`);
      }
    }
  }
  for (const theme of THEMES) {
    const map = tokens[theme];
    const canvas = parseColor(map.get("color-canvas") ?? "");
    for (const { fg, bg, min } of CONTRAST_PAIRS) {
      const front = parseColor(map.get(fg) ?? "");
      const back = parseColor(map.get(bg) ?? "");
      if (!front || !back) continue;
      // A translucent background is flattened over the canvas first.
      const base = canvas ?? { r: 255, g: 255, b: 255 };
      const flat = back.a < 1 ? flatten(back, base) : back;
      const ratio = contrastRatio(front, flat);
      if (ratio < min) {
        problems.push(
          `${fg} on ${bg} (${theme}): ${ratioText(ratio)}, needs ${min}:1`
        );
      }
    }
  }
  return { problems, notes: [] };
}

function flatten(color, base) {
  const a = color.a;
  return {
    r: color.r * a + base.r * (1 - a),
    g: color.g * a + base.g * (1 - a),
    b: color.b * a + base.b * (1 - a),
    a: 1,
  };
}

// Walks same-name tags from the opening tag to its matching close, so a
// sibling's states are never credited to the component.
function elementContent(html, id) {
  const open = html.match(
    new RegExp(
      `<([a-z][\\w-]*)\\b[^>]*(?<![\\w-])data-component=(["'])${id}\\2[^>]*>`,
      "i"
    )
  );
  return open ? contentFrom(html, open) : undefined;
}

function contentFrom(html, open) {
  const name = open[1];
  const start = open.index + open[0].length;
  if (open[0].endsWith("/>")) return "";
  const tags = new RegExp(`<(/?)${name}\\b[^>]*?(/?)>`, "gi");
  tags.lastIndex = start;
  let depth = 1;
  for (let m = tags.exec(html); m; m = tags.exec(html)) {
    if (m[2] === "/") continue;
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index);
  }
  return html.slice(start);
}

function componentRules(html) {
  const problems = [];
  const tags = html.match(/<[a-z][^>]*\bdata-component=[^>]*>/gi) ?? [];
  const present = tags.map((tag) => attribute(tag, "data-component"));
  for (const id of REQUIRED_COMPONENTS) {
    if (!present.includes(id)) problems.push(`${id}: missing component`);
  }
  for (const [id, states] of Object.entries(REQUIRED_STATES)) {
    const scope = elementContent(html, id);
    if (scope === undefined) continue;
    const have = (scope.match(/\bdata-state=(["'])(.*?)\1/gi) ?? []).map((m) =>
      attribute(m, "data-state")
    );
    for (const state of states) {
      if (!have.includes(state)) problems.push(`${id}: missing state ${state}`);
    }
  }
  return { problems, notes: [] };
}

function textOf(fragment) {
  return fragment
    .replace(/<[^>]*>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, name) => ENTITIES[name])
    .replace(/\s+/g, " ")
    .trim();
}

function samplesOf(html) {
  const samples = {};
  const duplicates = [];
  const tags = /<([a-z][\w-]*)\b[^>]*(?<![\w-])data-fill=(["'])(.*?)\2[^>]*>/gi;
  for (const open of html.matchAll(tags)) {
    const id = open[3];
    if (id in samples) {
      if (!duplicates.includes(id)) duplicates.push(id);
      continue;
    }
    samples[id] = textOf(contentFrom(html, open));
  }
  return { samples, duplicates };
}

function fillRules(html, options) {
  if (!options.samples) return { problems: [], notes: [] };
  const problems = [];
  for (const [id, text] of Object.entries(samplesOf(html).samples)) {
    if (options.samples[id] === text) problems.push(`unfilled: ${id}`);
  }
  return { problems, notes: [] };
}

function documentRules(html) {
  const problems = [];
  const notes = [];
  if (!/<title>\s*\S[\s\S]*?<\/title>/i.test(html)) {
    problems.push("title: not set");
  }
  if (!/<html\b[^>]*\blang=(["'])\s*\S+\s*\1/i.test(html)) {
    problems.push("html: no lang attribute");
  }
  if (!/<button\b[^>]*\bdata-theme-toggle\b/i.test(html)) {
    problems.push("theme toggle: no button with data-theme-toggle");
  }
  if (!/prefers-reduced-motion/.test(html)) {
    problems.push("motion: no prefers-reduced-motion rule");
  }
  try {
    if (readBlock(html, "fonts").css.trim() === "") {
      notes.push("fonts: not inlined");
    }
  } catch (error) {
    if (!(error instanceof TokenBlockError)) throw error;
    problems.push("fonts: missing fonts:start and fonts:end markers");
  }
  return { problems, notes };
}

// The one place a later rule is added.
const RULES = [
  chapterRules,
  tokenRules,
  componentRules,
  documentRules,
  fillRules,
];

function checkBrandBook(html, options = {}) {
  const problems = [];
  const notes = [];
  for (const rule of RULES) {
    const result = rule(html, options);
    problems.push(...result.problems);
    notes.push(...result.notes);
  }
  return { problems, notes };
}

function readHtml(path) {
  try {
    return existsSync(path) ? readFileSync(path, "utf8") : undefined;
  } catch {
    return undefined;
  }
}

function sameFile(a, b) {
  try {
    return realpathSync(a) === realpathSync(b);
  } catch {
    return false;
  }
}

// The template is the one file whose samples are meant to stay.
function samplesFor(path) {
  if (!existsSync(SAMPLES) || sameFile(path, fileURLToPath(TEMPLATE))) {
    return undefined;
  }
  return JSON.parse(readFileSync(SAMPLES, "utf8"));
}

function printSamples(html, io) {
  const { samples, duplicates } = samplesOf(html);
  for (const id of duplicates) io.stderr.write(`duplicate data-fill: ${id}\n`);
  if (duplicates.length > 0) return 1;
  io.stdout.write(`${JSON.stringify(samples, null, 2)}\n`);
  return 0;
}

function run(args, io) {
  const json = args.includes("--json");
  const samples = args.includes("--samples");
  const files = args.filter((arg) => !arg.startsWith("--"));
  const unknown = args.filter(
    (arg) => arg.startsWith("--") && arg !== "--json" && arg !== "--samples"
  );
  if (files.length !== 1 || unknown.length > 0 || (json && samples)) {
    io.stderr.write(`Usage: ${USAGE}`);
    return 2;
  }
  const path = resolve(io.cwd, files[0]);
  const html = readHtml(path);
  if (html === undefined) {
    io.stderr.write(`Cannot read ${files[0]}\n`);
    return 2;
  }
  if (samples) return printSamples(html, io);
  const result = checkBrandBook(html, { samples: samplesFor(path) });
  if (json) {
    io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    const lines = [
      ...result.problems,
      ...result.notes.map((note) => `note: ${note}`),
      `${result.problems.length} problems, ${result.notes.length} notes`,
    ];
    io.stdout.write(`${lines.join("\n")}\n`);
  }
  return result.problems.length === 0 ? 0 : 1;
}

export { checkBrandBook, run, samplesOf };
