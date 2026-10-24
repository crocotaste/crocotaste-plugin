const TOP_ORDER = ["version", "name", "description", "omitted"];
const TAIL_ORDER = ["colors", "spacing", "rounded", "typography", "components"];

const NUMBER = /^-?\d+(\.\d+)?$/;
// Shapes a standard YAML reader takes for a number, which we must keep quoted.
const NUMBER_LIKE =
  /^[-+]?(\d[\d_]*\.?\d*|\.\d+)([eE][-+]?\d+)?$|^0x[0-9a-f]+$|^0o[0-7]+$|^[-+]?\.(inf|nan)$/i;
const RESERVED = /^(null|~|yes|no|on|off|y|n|true|false)$/i;
const REFERENCE = /^\{[\w.-]+\}$/;
const PLAIN_KEY = /^[A-Za-z_][\w-]*$/;
// Anything YAML would read as something other than a plain string.
const NEEDS_QUOTES = /[#:{},[\]&*|>!%@`"'\\\n\r\t]|^\s|\s$|^-\s|^$/;
// Keys that would reach Object.prototype through a plain assignment.
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const ESCAPES = { n: "\n", r: "\r", t: "\t", '"': '"', "\\": "\\" };
const ESCAPED = {
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t",
  '"': '\\"',
  "\\": "\\\\",
};

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
    ? inner.replace(/\\(["\\nrt])/g, (_, char) => ESCAPES[char])
    : inner.replace(/''/g, "'");
}

// A comment starts at a # outside quotes and after whitespace.
function stripComment(text, line) {
  const quote = text[0];
  if (quote === '"' || quote === "'") {
    let i = 1;
    while (i < text.length) {
      if (quote === '"' && text[i] === "\\") i += 2;
      else if (text[i] === quote) {
        if (quote === "'" && text[i + 1] === "'") i += 2;
        else break;
      } else i += 1;
    }
    if (i >= text.length) {
      throw new YamlSubsetError("Unterminated quoted string", line);
    }
    const tail = text.slice(i + 1).trim();
    if (tail !== "" && !tail.startsWith("#")) {
      throw new YamlSubsetError("Unexpected text after a quoted string", line);
    }
    return text.slice(0, i + 1);
  }
  return text.replace(/(^|\s)#.*$/, "").trim();
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
  if (text === "null" || text === "~") return null;
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
  const root = Object.create(null);
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
    const split = splitKey(content, line);
    const key = split.key;
    if (FORBIDDEN_KEYS.has(key)) {
      throw new YamlSubsetError(`The key "${key}" is not allowed`, line);
    }
    const rest = stripComment(split.rest, line);
    const parent = stack.at(-1).map;
    if (rest === "") {
      const child = Object.create(null);
      parent[key] = child;
      stack.push({ indent, map: child });
    } else {
      parent[key] = parseScalar(rest, line);
    }
  }
  return root;
}

function emitKey(key) {
  return PLAIN_KEY.test(key) && !RESERVED.test(key)
    ? key
    : emitScalar(key, true);
}

function emitScalar(value, forceQuote = false) {
  if (value === null) return "null";
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value !== "string") {
    throw new YamlSubsetError(`Cannot write a ${typeof value} value`, 0);
  }
  const quote =
    forceQuote ||
    NEEDS_QUOTES.test(value) ||
    NUMBER_LIKE.test(value) ||
    RESERVED.test(value);
  // Non-ASCII stays as written; only what would break the line is escaped.
  return quote
    ? `"${value.replace(/["\\\n\r\t]/g, (char) => ESCAPED[char])}"`
    : value;
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
