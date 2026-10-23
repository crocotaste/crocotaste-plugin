import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  parseTokens,
  readTokenBlock,
  REQUIRED_TOKENS,
  TokenBlockError,
} from "../lib/css-tokens.mjs";
import {
  BODY_SKELETON,
  SECTIONS,
  frontmatterFromTokens,
  mergeFrontmatter,
  ownedKeysOf,
  readComponents,
  readTitle,
  splitDesignMd,
} from "../lib/design-md.mjs";
import { emitYaml, parseYaml, YamlSubsetError } from "../lib/yaml.mjs";

const USAGE = "crocotaste tokens <BRAND.html> <DESIGN.md> --write | --print\n";

function keptCount(existing, generated) {
  if (!existing) return 0;
  let kept = 0;
  for (const [key, value] of Object.entries(existing)) {
    if (!SECTIONS.includes(key)) kept += 1;
    else if (value && typeof value === "object") {
      kept += Object.keys(value).filter((k) => !(k in generated[key])).length;
    }
  }
  return kept;
}

function run(args, io) {
  const flags = args.filter((arg) => arg.startsWith("--"));
  const files = args.filter((arg) => !arg.startsWith("--"));
  const write = flags.includes("--write");
  const print = flags.includes("--print");
  if (files.length !== 2 || write === print || flags.length !== 1) {
    io.stderr.write(`Usage: ${USAGE}`);
    return 2;
  }
  const brandPath = resolve(io.cwd, files[0]);
  const designPath = resolve(io.cwd, files[1]);
  if (!existsSync(brandPath)) {
    io.stderr.write(`Cannot find ${files[0]}\n`);
    return 1;
  }
  const html = readFileSync(brandPath, "utf8");

  let tokens;
  let componentMap;
  try {
    tokens = parseTokens(readTokenBlock(html).css);
    componentMap = readComponents(html);
  } catch (error) {
    if (!(error instanceof TokenBlockError)) throw error;
    io.stderr.write(`${error.message}\n`);
    return 1;
  }
  const missing = REQUIRED_TOKENS.filter((name) => !tokens.light.has(name));
  if (missing.length > 0) {
    io.stderr.write(
      `BRAND.html is missing required tokens: ${missing.join(", ")}\n`
    );
    return 1;
  }
  for (const warning of componentMap.warnings) io.stderr.write(`${warning}\n`);

  const hadFile = existsSync(designPath);
  const { frontmatter, body } = hadFile
    ? splitDesignMd(readFileSync(designPath, "utf8"))
    : { frontmatter: null, body: BODY_SKELETON };
  let existing = null;
  try {
    if (frontmatter !== null) existing = parseYaml(frontmatter);
  } catch (error) {
    if (!(error instanceof YamlSubsetError)) throw error;
    // The opening --- line shifts every frontmatter line by one.
    io.stderr.write(
      `${files[1]} frontmatter: ${error.message.replace(/\(line \d+\)/, `(line ${error.line + 1})`)}\n`
    );
    return 1;
  }

  const generated = {
    ...frontmatterFromTokens(tokens, componentMap),
    name: readTitle(html),
  };
  const ownedKeys = ownedKeysOf(
    generated,
    Object.keys(componentMap.components)
  );
  const merged = mergeFrontmatter(existing, generated, ownedKeys);
  const text = `---\n${emitYaml(merged)}---\n`;

  if (print) {
    io.stdout.write(text);
    return 0;
  }
  mkdirSync(dirname(designPath), { recursive: true });
  writeFileSync(designPath, `${text}${body}`);
  const count = (section) => Object.keys(generated[section]).length;
  io.stdout.write(
    `wrote ${files[1]} (${count("colors")} colors, ${count("spacing")} spacing, ${count("rounded")} rounded, ${count("typography")} typography, ${count("components")} components; kept ${keptCount(existing, generated)} keys)\n`
  );
  return 0;
}

export { run };
