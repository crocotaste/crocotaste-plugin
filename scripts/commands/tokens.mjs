import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  parseTokens,
  readTokenBlock,
  REQUIRED_TOKENS,
  TokenBlockError,
} from "../lib/css-tokens.mjs";
import {
  BODY_SKELETON,
  frontmatterFromTokens,
  keptCount,
  mergeFrontmatter,
  ownedKeysOf,
  readComponents,
  readTitle,
  splitDesignMd,
} from "../lib/design-md.mjs";
import { FileGuardError, readInput, writeFileSafely } from "../lib/files.mjs";
import { emitYaml, parseYaml, YamlSubsetError } from "../lib/yaml.mjs";

const USAGE =
  "node scripts/crocotaste.mjs tokens <BRAND.html> <DESIGN.md> --write | --print\n";

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
  let html;
  try {
    html = readInput(brandPath, files[0]);
  } catch (error) {
    if (!(error instanceof FileGuardError)) throw error;
    io.stderr.write(`${error.message}\n`);
    return 2;
  }

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
  const unresolved = new Set();
  for (const map of [tokens.light, tokens.dark]) {
    for (const [name, value] of map) {
      if (value.includes("var(")) unresolved.add(name);
    }
  }
  for (const name of unresolved) {
    io.stderr.write(`warning: ${name} does not resolve\n`);
  }

  const hadFile = existsSync(designPath);
  const split = hadFile
    ? splitDesignMd(readFileSync(designPath, "utf8"))
    : {
        frontmatter: null,
        body: BODY_SKELETON,
        bom: "",
        eol: "\n",
        misplaced: false,
        rules: false,
      };
  const { frontmatter, body, bom, eol } = split;
  if (split.misplaced) {
    io.stderr.write(
      `${files[1]} has a --- block that is not at the top of the file. Move it to the top or remove it, then run tokens again.\n`
    );
    return 1;
  }
  if (split.rules) {
    io.stderr.write(
      `${files[1]} has no frontmatter block. Add one at the top (tokens --write creates it on a new file); the horizontal rules in the body are left alone.\n`
    );
    return 1;
  }
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
  const text = `---\n${emitYaml(merged)}---\n`.replace(/\n/g, eol);

  if (print) {
    io.stdout.write(text);
    return 0;
  }
  mkdirSync(dirname(designPath), { recursive: true });
  try {
    writeFileSafely(designPath, `${bom}${text}${body}`, files[1]);
  } catch (error) {
    if (!(error instanceof FileGuardError)) throw error;
    io.stderr.write(`${error.message}\n`);
    return 2;
  }
  const count = (section) => Object.keys(generated[section]).length;
  io.stdout.write(
    `wrote ${files[1]} (${count("colors")} colors, ${count("spacing")} spacing, ${count("rounded")} rounded, ${count("typography")} typography, ${count("components")} components; kept ${keptCount(existing, merged, generated)} keys)\n`
  );
  return 0;
}

export { run };
