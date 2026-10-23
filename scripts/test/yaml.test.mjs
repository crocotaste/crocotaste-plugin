import { test } from "node:test";
import assert from "node:assert/strict";
import { parseYaml, emitYaml, YamlSubsetError } from "../lib/yaml.mjs";

const sample = {
  version: "alpha",
  name: "Sample Co",
  colors: { canvas: "#ffffff", primary: "#2456e6", "dark-canvas": "#0b0d10" },
  spacing: { 0.5: "2px", 4: "16px" },
  rounded: { md: "8px" },
  typography: {
    body: {
      fontFamily: "Inter",
      fontSize: "16px",
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: "-0.02em",
    },
  },
  components: {
    "button-primary": {
      backgroundColor: "{colors.primary}",
      rounded: "{rounded.md}",
    },
  },
};

test("round-trips a nested map with quoted and bare scalars", () => {
  assert.deepEqual(parseYaml(emitYaml(sample)), sample);
});

test("quotes keys like 0.5 and values with # or {", () => {
  assert.ok(emitYaml({ spacing: { 0.5: "2px" } }).includes('"0.5": 2px'));
  assert.ok(emitYaml({ c: { a: "#fff" } }).includes('"#fff"'));
  assert.ok(emitYaml({ c: { a: "{colors.x}" } }).includes('"{colors.x}"'));
});

test("writes top-level keys in the agreed order", () => {
  const text = emitYaml({
    components: { a: { b: "{colors.x}" } },
    custom: "yes",
    colors: { x: "#fff" },
    description: "d",
    name: "n",
    version: "alpha",
  });
  const keys = text.split("\n").filter((l) => /^\w/.test(l));
  assert.deepEqual(
    keys.map((l) => l.split(":")[0]),
    ["version", "name", "description", "custom", "colors", "components"]
  );
});

test("reads a bare {a.b} reference and a quoted one as strings", () => {
  const parsed = parseYaml('c:\n  a: {colors.x}\n  b: "{colors.y}"\n');
  assert.deepEqual(parsed, { c: { a: "{colors.x}", b: "{colors.y}" } });
});

test("throws YamlSubsetError with a line number on a sequence", () => {
  assert.throws(
    () => parseYaml("a:\n  - b"),
    (error) => error instanceof YamlSubsetError && error.line === 2
  );
});

test("throws on anchors, block scalars and flow collections", () => {
  for (const text of ["a: &x 1", "a: *x", "a: |\n  t", "a: >\n  t", "a: [1]"]) {
    assert.throws(() => parseYaml(text), YamlSubsetError, text);
  }
  assert.throws(
    () => parseYaml("a: { b: 1 }"),
    (error) => error instanceof YamlSubsetError && error.line === 1
  );
});

test("strips a trailing comment outside quotes", () => {
  assert.deepEqual(parseYaml("version: alpha # spec\n"), { version: "alpha" });
  assert.deepEqual(parseYaml("a: \"#fff\" # brand\nb: 'x # y' # z\n"), {
    a: "#fff",
    b: "x # y",
  });
  assert.deepEqual(parseYaml("a: # note\n  b: 1\n"), { a: { b: 1 } });
});

test("quotes words and numbers a standard reader would misread", () => {
  const words = [
    "null",
    "~",
    "yes",
    "No",
    "ON",
    "off",
    "y",
    "N",
    ".5",
    "1e3",
    "1.",
    "0x1F",
    "-.5",
    ".inf",
  ];
  const value = Object.fromEntries(words.map((w, i) => [`k${i}`, w]));
  const keys = Object.fromEntries(
    ["true", "null", "yes", "Off"].map((k) => [k, "v"])
  );
  const sample = { v: value, k: keys };
  const text = emitYaml(sample);
  for (const w of words) assert.ok(text.includes(`"${w}"`), w);
  for (const k of Object.keys(keys)) assert.ok(text.includes(`"${k}":`), k);
  assert.deepEqual(parseYaml(text), sample);
});
