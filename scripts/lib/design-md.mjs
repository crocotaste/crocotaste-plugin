import {
  parseTokens,
  readTokenBlock,
  TYPE_STYLE_SUFFIXES,
} from "./css-tokens.mjs";

const SECTIONS = ["colors", "spacing", "rounded", "typography", "components"];

const HEADINGS = [
  "Overview",
  "Colors",
  "Typography",
  "Layout",
  "Elevation & Depth",
  "Shapes",
  "Components",
  "Do's and Don'ts",
  "Decisions",
];

const BODY_SKELETON = HEADINGS.map(
  (heading) =>
    `## ${heading}\n\n<!-- written by the agent from BRAND.html chapter NN -->\n`
).join("\n");

const FRONTMATTER = /^---\r?\n([\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/;
const MISPLACED_BLOCK = /^---[ \t]*\r?\n[\s\S]*?^---[ \t]*$/m;
const BOM = "\uFEFF";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function numeric(value) {
  return /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value;
}

// Google's DESIGN.md lint rejects a unitless 0 as a dimension, and older brand
// books still carry one.
function dimension(value) {
  return value === "0" ? "0em" : value;
}

function firstFamily(value) {
  return value
    .split(",")[0]
    .trim()
    .replace(/^["']|["']$/g, "");
}

function namesWith(map, prefix) {
  return [...map.keys()]
    .filter((key) => key.startsWith(prefix))
    .map((key) => [key.slice(prefix.length), map.get(key)]);
}

function isCompanion(name, light) {
  return TYPE_STYLE_SUFFIXES.some(
    (suffix) =>
      name.endsWith(`-${suffix}`) &&
      light.has(`text-${name.slice(0, -suffix.length - 1)}`)
  );
}

function typographyOf(light) {
  const styles = {};
  for (const [name, size] of namesWith(light, "text-")) {
    if (isCompanion(name, light)) continue;
    const role = light.get(`text-${name}-family`);
    const family = light.get(`font-${role}`) ?? light.get("font-body");
    const weight = light.get(`text-${name}-weight`);
    const leading = light.get(`text-${name}-leading`);
    const tracking = light.get(`text-${name}-tracking`);
    const style = {};
    if (family !== undefined) style.fontFamily = firstFamily(family);
    style.fontSize = size;
    if (weight !== undefined) style.fontWeight = numeric(weight);
    if (leading !== undefined) style.lineHeight = numeric(leading);
    if (tracking !== undefined) style.letterSpacing = dimension(tracking);
    styles[name] = style;
  }
  return styles;
}

// Section content stops at the first closing tag: the components chapter holds
// no nested sections.
function componentsSection(html) {
  const open = html.search(/<section\b[^>]*\bid=["']components["']/);
  if (open === -1) return "";
  const close = html.indexOf("</section>", open);
  return html.slice(open, close === -1 ? html.length : close);
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=("([^"]*)"|'([^']*)')`));
  return match ? (match[2] ?? match[3]) : undefined;
}

function readComponents(html) {
  const { light } = parseTokens(readTokenBlock(html).css);
  const components = {};
  const warnings = [];
  const tags = componentsSection(html).match(
    /<[a-z][^>]*\bdata-component=[^>]*>/gi
  );
  for (const tag of tags ?? []) {
    const id = attribute(tag, "data-component");
    const props = {};
    for (const pair of (attribute(tag, "data-tokens") ?? "").split(/\s+/)) {
      const [prop, token] = pair.split("=");
      if (!prop || !token) continue;
      const isRadius = prop === "rounded";
      if (!light.has(`${isRadius ? "radius" : "color"}-${token}`)) {
        warnings.push(`${id}: ${prop} uses unknown token "${token}"`);
        continue;
      }
      props[prop] = isRadius ? `{rounded.${token}}` : `{colors.${token}}`;
    }
    components[id] = props;
  }
  return { components, warnings };
}

function readTitle(html) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = match?.[1].split(" · ")[0].trim();
  return title || undefined;
}

function frontmatterFromTokens(tokens, componentMap) {
  const { light, dark } = tokens;
  const colors = {};
  for (const [name, value] of namesWith(light, "color-")) colors[name] = value;
  for (const [name, value] of namesWith(dark, "color-")) {
    if (value !== light.get(`color-${name}`)) colors[`dark-${name}`] = value;
  }
  const spacing = Object.fromEntries(namesWith(light, "space-"));
  const rounded = Object.fromEntries(namesWith(light, "radius-"));
  const components = Object.fromEntries(
    Object.entries(componentMap.components).filter(
      ([, props]) => Object.keys(props).length > 0
    )
  );
  return {
    version: "alpha",
    colors,
    spacing,
    rounded,
    typography: typographyOf(light),
    components,
  };
}

// A color that no longer differs in dark mode is ours to remove too.
function ownedKeysOf(generated, componentIds) {
  const owned = {};
  for (const section of SECTIONS)
    owned[section] = new Set(Object.keys(generated[section]));
  for (const name of Object.keys(generated.colors)) {
    if (!name.startsWith("dark-")) owned.colors.add(`dark-${name}`);
  }
  for (const id of componentIds) owned.components.add(id);
  return owned;
}

// The byte-order mark and leading blank lines are not ours to lose; a --- block
// anywhere else is reported as misplaced so nothing is stacked on top of it.
function splitDesignMd(text) {
  const bom = text.startsWith(BOM) ? BOM : "";
  const rest = text.slice(bom.length);
  const eol = rest.includes("\r\n") ? "\r\n" : "\n";
  const trimmed = rest.replace(/^(?:[ \t]*\r?\n)+/, "");
  const match = trimmed.match(FRONTMATTER);
  if (!match) {
    return {
      frontmatter: null,
      body: rest,
      bom,
      eol,
      misplaced: MISPLACED_BLOCK.test(rest),
    };
  }
  return {
    frontmatter: match[1] ?? "",
    body: trimmed.slice(match[0].length),
    bom,
    eol,
    misplaced: false,
  };
}

function mergeFrontmatter(existing, generated, ownedKeys) {
  const merged = { ...existing };
  if (merged.version === undefined) merged.version = generated.version;
  if (merged.name === undefined && generated.name !== undefined) {
    merged.name = generated.name;
  }
  for (const section of SECTIONS) {
    const kept = Object.fromEntries(
      Object.entries(
        isObject(existing?.[section]) ? existing[section] : {}
      ).filter(([key]) => !ownedKeys[section].has(key))
    );
    merged[section] = { ...kept, ...generated[section] };
  }
  return merged;
}

export {
  BODY_SKELETON,
  SECTIONS,
  frontmatterFromTokens,
  mergeFrontmatter,
  ownedKeysOf,
  readComponents,
  readTitle,
  splitDesignMd,
};
