const VAR_REFERENCE = /var\(\s*--([\w-]+)\s*(?:,[^)]*)?\)/g;
const DARK_SELECTOR = /\[data-theme\s*=\s*(["'])dark\1\]/;

const REQUIRED_TOKENS = [
  "color-canvas",
  "color-surface",
  "color-surface-raised",
  "color-border",
  "color-border-strong",
  "color-text",
  "color-text-muted",
  "color-text-faint",
  "color-text-inverse",
  "color-primary",
  "color-primary-hover",
  "color-primary-active",
  "color-primary-text",
  "color-primary-soft",
  "color-accent",
  "color-success",
  "color-warning",
  "color-danger",
  "color-focus",
  "space-1",
  "space-2",
  "space-3",
  "space-4",
  "space-6",
  "space-8",
  "space-12",
  "space-16",
  "radius-sm",
  "radius-md",
  "radius-lg",
  "radius-full",
  "font-display",
  "font-body",
  "font-mono",
  "text-display",
  "text-title",
  "text-heading",
  "text-body",
  "text-small",
  "text-caption",
  "motion-fast",
  "motion-base",
  "motion-slow",
];

const TYPE_STYLE_SUFFIXES = ["weight", "leading", "family", "tracking"];

class TokenBlockError extends Error {
  constructor(message) {
    super(message);
    this.name = "TokenBlockError";
  }
}

// Every marked region of the brand book is read the same way, so a later
// block (fonts, for one) only needs a new name. Inside <style> a bare marker
// turns the next rule into an invalid selector, so a marker may sit in a CSS
// comment, `/* <!-- tokens:start --> */`, and the comment stays outside.
function readBlock(html, name) {
  const open = `<!-- ${name}:start -->`;
  const close = `<!-- ${name}:end -->`;
  const from = html.indexOf(open);
  if (from === -1) throw new TokenBlockError(`Missing marker ${open}`);
  const to = html.indexOf(close, from + open.length);
  if (to === -1) throw new TokenBlockError(`Missing marker ${close}`);
  let start = from + open.length;
  let end = to;
  // Each side is judged alone, so a bare marker never strands half a comment.
  if (/\/\*[ \t]*$/.test(html.slice(0, from))) {
    start += html.slice(start).match(/^[ \t]*\*\//)?.[0].length ?? 0;
  }
  if (/^[ \t]*\*\//.test(html.slice(to + close.length))) {
    end -= html.slice(0, to).match(/\/\*[ \t]*$/)?.[0].length ?? 0;
  }
  return { css: html.slice(start, end), start, end };
}

function readTokenBlock(html) {
  return readBlock(html, "tokens");
}

// A brace walk instead of a regex, so a nested rule cannot end a block early.
function blocksOf(css) {
  const blocks = [];
  let depth = 0;
  let selectorStart = 0;
  let bodyStart = 0;
  let selector = "";
  for (let i = 0; i < css.length; i += 1) {
    const char = css[i];
    if (char === "{") {
      if (depth === 0) {
        selector = css.slice(selectorStart, i).trim();
        bodyStart = i + 1;
      }
      depth += 1;
    } else if (char === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0) {
        blocks.push({ selector, body: css.slice(bodyStart, i) });
        selectorStart = i + 1;
      }
    }
  }
  return blocks;
}

// Values such as url(data:...;base64) hold semicolons inside parentheses.
function declarationsOf(body) {
  const declarations = [];
  let depth = 0;
  let current = "";
  for (const char of body) {
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === ";" && depth === 0) {
      declarations.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  declarations.push(current);
  return declarations;
}

function collect(set, body) {
  for (const declaration of declarationsOf(body)) {
    const match = declaration.match(/^\s*--([\w-]+)\s*:\s*([\s\S]*?)\s*$/);
    if (match) set.set(match[1], match[2]);
  }
}

function resolveSet(set, fallback) {
  const lookup = (name, seen) => {
    const raw = set.get(name) ?? fallback?.get(name);
    if (raw === undefined || seen.has(name)) return undefined;
    const next = new Set(seen).add(name);
    let resolved = true;
    const value = raw.replace(VAR_REFERENCE, (whole, reference) => {
      const target = lookup(reference, next);
      if (target === undefined || target.includes("var(")) {
        resolved = false;
        return whole;
      }
      return target;
    });
    return resolved ? value : raw;
  };
  const result = new Map();
  for (const name of set.keys()) result.set(name, lookup(name, new Set()));
  return result;
}

function parseTokens(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const light = new Map();
  const dark = new Map();
  for (const { selector, body } of blocksOf(clean)) {
    if (selector === ":root") collect(light, body);
    else if (DARK_SELECTOR.test(selector)) collect(dark, body);
  }
  const resolvedLight = resolveSet(light);
  return { light: resolvedLight, dark: resolveSet(dark, resolvedLight) };
}

function hueToChannel(p, q, t) {
  const wrapped = ((t % 1) + 1) % 1;
  if (wrapped < 1 / 6) return p + (q - p) * 6 * wrapped;
  if (wrapped < 1 / 2) return q;
  if (wrapped < 2 / 3) return p + (q - p) * (2 / 3 - wrapped) * 6;
  return p;
}

function hslToRgb(h, s, l) {
  const hue = (((h % 360) + 360) % 360) / 360;
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    hueToChannel(p, q, hue + 1 / 3),
    hueToChannel(p, q, hue),
    hueToChannel(p, q, hue - 1 / 3),
  ];
}

function parseAlpha(text) {
  if (text === undefined) return 1;
  const value = text.endsWith("%")
    ? Number.parseFloat(text) / 100
    : Number(text);
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : null;
}

function parseChannel(text) {
  const value = text.endsWith("%")
    ? (Number.parseFloat(text) / 100) * 255
    : Number(text);
  return Number.isFinite(value)
    ? Math.min(255, Math.max(0, Math.round(value)))
    : null;
}

function parseHex(value) {
  const hex = value.slice(1);
  if (![3, 4, 6, 8].includes(hex.length) || !/^[0-9a-f]+$/i.test(hex))
    return null;
  const full = hex.length <= 4 ? [...hex].map((c) => c + c).join("") : hex;
  const channel = (i) => Number.parseInt(full.slice(i, i + 2), 16);
  return {
    r: channel(0),
    g: channel(2),
    b: channel(4),
    a: full.length === 8 ? channel(6) / 255 : 1,
  };
}

function parseFunction(value) {
  const match = value.match(/^(rgba?|hsla?)\(\s*([^)]*?)\s*\)$/i);
  if (!match) return null;
  const parts = match[2].split(/\s*[,/]\s*|\s+/).filter(Boolean);
  if (parts.length < 3 || parts.length > 4) return null;
  const alpha = parseAlpha(parts[3]);
  if (alpha === null) return null;
  if (match[1].toLowerCase().startsWith("rgb")) {
    const [r, g, b] = parts.slice(0, 3).map(parseChannel);
    return [r, g, b].includes(null) ? null : { r, g, b, a: alpha };
  }
  const h = Number.parseFloat(parts[0]);
  const s = Number.parseFloat(parts[1]) / 100;
  const l = Number.parseFloat(parts[2]) / 100;
  if (![h, s, l].every(Number.isFinite)) return null;
  const [r, g, b] = hslToRgb(h, s, l).map((c) => Math.round(c * 255));
  return { r, g, b, a: alpha };
}

function parseColor(value) {
  const text = String(value).trim();
  if (text.startsWith("#")) return parseHex(text);
  return parseFunction(text);
}

export {
  REQUIRED_TOKENS,
  TYPE_STYLE_SUFFIXES,
  TokenBlockError,
  parseColor,
  parseTokens,
  readBlock,
  readTokenBlock,
};
