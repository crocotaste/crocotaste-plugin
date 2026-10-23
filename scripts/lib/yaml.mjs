const TOP_ORDER = ["version", "name", "description", "omitted"];
const TAIL_ORDER = ["colors", "spacing", "rounded", "typography", "components"];

const NUMBER = /^-?\d+(\.\d+)?$/;
const REFERENCE = /^\{[\w.-]+\}$/;
const PLAIN_KEY = /^[A-Za-z_][\w-]*$/;
// Anything YAML would read as something other than a plain string.
const NEEDS_QUOTES = /[#:{},[\]&*|>!%@`"'\\]|^\s|\s$|^-\s|^$/;

class YamlSubsetError extends Error {
  constructor(message, line) {
    super(`${message} (line ${line})`);
    this.name = "YamlSubsetError";
    this.line = line;
  }
}

function unquote(text, line) {
  const quote = text[0];
  if (text.length < 2 || text.at(-1) !== quote) {
    throw new YamlSubsetError("Unterminated quoted string", line);
  }
  const inner = text.slice(1, -1);
  return quote === '"'
    ? inner.replace(/\\(["\\])/g, "$1")
    : inner.replace(/''/g, "'");
}

function parseScalar(text, line) {
  if (text[0] === '"' || text[0] === "'") return unquote(text, line);
  if (REFERENCE.test(text)) return text;
  if (text[0] === "&" || text[0] === "*") {
    throw new YamlSubsetError("Anchors and aliases are not supported", line);
  }
  if (text[0] === "|" || text[0] === ">") {
    throw new YamlSubsetError("Multi-line scalars are not supported", line);
  }
  if (text[0] === "[" || text[0] === "{") {
    throw new YamlSubsetError("Flow collections are not supported", line);
  }
  if (NUMBER.test(text)) return Number(text);
  if (text === "true") return true;
  if (text === "false") return false;
  return text;
}

function splitKey(content, line) {
  let index;
  if (content[0] === '"' || content[0] === "'") {
    const close = content.indexOf(content[0], 1);
    index = close === -1 ? -1 : close + 1;
    if (content[index] !== ":") index = -1;
  } else {
    index = content.indexOf(":");
  }
  if (index === -1) throw new YamlSubsetError("Expected key: value", line);
  const rawKey = content.slice(0, index).trim();
  const key =
    rawKey[0] === '"' || rawKey[0] === "'" ? unquote(rawKey, line) : rawKey;
  return { key, rest: content.slice(index + 1).trim() };
}

function parseYaml(text) {
  const root = {};
  const stack = [{ indent: -1, map: root }];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = i + 1;
    const raw = lines[i];
    if (raw.trim() === "" || raw.trim().startsWith("#")) continue;
    const indent = raw.length - raw.trimStart().length;
    const content = raw.trim();
    if (content === "-" || content.startsWith("- ")) {
      throw new YamlSubsetError("Sequences are not supported", line);
    }
    while (stack.length > 1 && indent <= stack.at(-1).indent) stack.pop();
    const { key, rest } = splitKey(content, line);
    const parent = stack.at(-1).map;
    if (rest === "") {
      const child = {};
      parent[key] = child;
      stack.push({ indent, map: child });
    } else {
      parent[key] = parseScalar(rest, line);
    }
  }
  return root;
}

function emitKey(key) {
  return PLAIN_KEY.test(key) ? key : emitScalar(key, true);
}

function emitScalar(value, forceQuote = false) {
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value !== "string") {
    throw new YamlSubsetError(`Cannot write a ${typeof value} value`, 0);
  }
  const quote =
    forceQuote ||
    NEEDS_QUOTES.test(value) ||
    NUMBER.test(value) ||
    value === "true" ||
    value === "false";
  return quote ? `"${value.replace(/(["\\])/g, "\\$1")}"` : value;
}

function emitMap(map, depth) {
  const pad = "  ".repeat(depth);
  let out = "";
  for (const [key, value] of Object.entries(map)) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      out += `${pad}${emitKey(key)}:\n${emitMap(value, depth + 1)}`;
    } else {
      out += `${pad}${emitKey(key)}: ${emitScalar(value)}\n`;
    }
  }
  return out;
}

function emitYaml(value) {
  const ordered = {};
  for (const key of TOP_ORDER) if (key in value) ordered[key] = value[key];
  for (const key of Object.keys(value)) {
    if (!TOP_ORDER.includes(key) && !TAIL_ORDER.includes(key)) {
      ordered[key] = value[key];
    }
  }
  for (const key of TAIL_ORDER) if (key in value) ordered[key] = value[key];
  return emitMap(ordered, 0);
}

export { YamlSubsetError, emitYaml, parseYaml };
