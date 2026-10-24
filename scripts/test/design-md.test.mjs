import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseTokens, readTokenBlock } from "../lib/css-tokens.mjs";
import { parseYaml } from "../lib/yaml.mjs";
import {
  frontmatterFromTokens,
  keptCount,
  mergeFrontmatter,
  ownedKeysOf,
  readComponents,
  readTitle,
  splitDesignMd,
} from "../lib/design-md.mjs";

const html = readFileSync(
  new URL("./fixtures/brand-min.html", import.meta.url),
  "utf8"
);
const existingMd = readFileSync(
  new URL("./fixtures/design-existing.md", import.meta.url),
  "utf8"
);
const tokens = parseTokens(readTokenBlock(html).css);

test("frontmatterFromTokens maps the four sections and typography styles", () => {
  const fm = frontmatterFromTokens(tokens, readComponents(html));
  assert.equal(fm.version, "alpha");
  assert.equal(fm.colors.canvas, "#ffffff");
  assert.equal(fm.spacing["4"], "16px");
  assert.equal(fm.rounded.md, "8px");
  assert.deepEqual(fm.typography.body, {
    fontFamily: "Inter",
    fontSize: "16px",
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: "0em",
  });
  assert.equal(fm.typography.display.letterSpacing, "-0.02em");
  assert.equal(fm.typography["display-weight"], undefined);
  assert.equal(fm.colors.focus, "#2456e6");
});

test("a bare 0 tracking becomes 0em and an em value stays as is", () => {
  const css = parseTokens(
    ":root{--font-body:Inter;--text-body:16px;--text-body-family:body;--text-body-tracking:0;--text-title:24px;--text-title-family:body;--text-title-tracking:-0.025em;}"
  );
  const fm = frontmatterFromTokens(css, { components: {}, warnings: [] });
  assert.equal(fm.typography.body.letterSpacing, "0em");
  assert.equal(fm.typography.title.letterSpacing, "-0.025em");
});

test("dark values that differ become dark-<name>", () => {
  const fm = frontmatterFromTokens(tokens, readComponents(html));
  assert.equal(fm.colors["dark-canvas"], "#0b0d10");
  assert.equal(fm.colors["dark-primary"], "#6d8ff0");
  const same = parseTokens(
    ':root{--color-primary:#111111;} [data-theme="dark"]{--color-primary:#111111;}'
  );
  assert.equal(
    frontmatterFromTokens(same, { components: {}, warnings: [] }).colors[
      "dark-primary"
    ],
    undefined
  );
});

test("readComponents builds references and warns on unknown tokens", () => {
  const { components, warnings } = readComponents(html);
  assert.equal(
    components["button-primary"].backgroundColor,
    "{colors.primary}"
  );
  assert.equal(components["button-primary"].rounded, "{rounded.full}");
  assert.deepEqual(warnings, []);
  const bad = readComponents(
    html.replace("textColor=text rounded=md", "textColor=nope rounded=md")
  );
  assert.ok(bad.warnings[0].includes("nope"));
  assert.equal(bad.components.input.textColor, undefined);
  assert.equal(bad.components.input.rounded, "{rounded.md}");
});

test("readTitle takes the part before the first middle dot", () => {
  assert.equal(readTitle(html), "Sample");
  assert.equal(readTitle("<html></html>"), undefined);
});

test("mergeFrontmatter keeps unknown keys and the version", () => {
  const generated = frontmatterFromTokens(tokens, readComponents(html));
  const existing = parseYaml(splitDesignMd(existingMd).frontmatter);
  existing.description = "mine";
  const merged = mergeFrontmatter(
    existing,
    { ...generated, name: "Other" },
    ownedKeysOf(generated, Object.keys(readComponents(html).components))
  );
  assert.equal(merged.colors["exception-chart-line"], "#123456");
  assert.equal(merged.colors.primary, "#2456e6");
  assert.equal(merged.version, "alpha");
  assert.equal(merged.name, "Sample");
  assert.equal(merged.description, "mine");
  assert.equal(merged.typography.body.letterSpacing, "0em");
});

test("mergeFrontmatter on nothing adds the name from the title", () => {
  const generated = {
    ...frontmatterFromTokens(tokens, readComponents(html)),
    name: "Sample",
  };
  const merged = mergeFrontmatter(null, generated, ownedKeysOf(generated, []));
  assert.equal(merged.name, "Sample");
});

test("splitDesignMd separates frontmatter and body, and handles no frontmatter", () => {
  const { frontmatter, body } = splitDesignMd(existingMd);
  assert.ok(frontmatter.startsWith("version: alpha"));
  assert.ok(body.includes("## Decisions"));
  assert.ok(!body.includes("version: alpha"));
  const none = splitDesignMd("# Just a body\n");
  assert.equal(none.frontmatter, null);
  assert.equal(none.body, "# Just a body\n");
});

test("splitDesignMd reads past a byte-order mark and leading blank lines", () => {
  const split = splitDesignMd(`﻿\n\n${existingMd}`);
  assert.equal(split.bom, "﻿");
  assert.ok(split.frontmatter.startsWith("version: alpha"));
  assert.equal(split.body, splitDesignMd(existingMd).body);
});

test("splitDesignMd flags a --- block that is not at the top", () => {
  const split = splitDesignMd("# Title\n\n---\nversion: alpha\n---\n");
  assert.equal(split.frontmatter, null);
  assert.equal(split.misplaced, true);
  assert.equal(splitDesignMd("# Title\n\ntext\n").misplaced, false);
});

test("typography always has a fontFamily, falling back to the body role", () => {
  const css = readTokenBlock(html).css.replace(
    "--text-small-family: body;",
    ""
  );
  const fm = frontmatterFromTokens(parseTokens(css), {
    components: {},
    warnings: [],
  });
  assert.equal(fm.typography.small.fontFamily, "Inter");
});

test("mergeFrontmatter keeps a hand-added sub-key under an owned component and an owned type style", () => {
  const generated = frontmatterFromTokens(tokens, readComponents(html));
  const existing = {
    components: {
      "button-primary": {
        backgroundColor: "{colors.ink}",
        padding: "12px",
        height: "40px",
      },
    },
    typography: { body: { fontSize: "99px", fontFeature: "tnum" } },
  };
  const owned = ownedKeysOf(
    generated,
    Object.keys(readComponents(html).components)
  );
  const merged = mergeFrontmatter(existing, generated, owned);
  const button = merged.components["button-primary"];
  assert.equal(button.padding, "12px");
  assert.equal(button.height, "40px");
  assert.equal(button.backgroundColor, "{colors.primary}");
  assert.equal(merged.typography.body.fontFeature, "tnum");
  assert.equal(merged.typography.body.fontSize, "16px");
  assert.equal(keptCount(existing, merged, generated), 3);
});

test("mergeFrontmatter removes an owned sub-key this run no longer emits", () => {
  const generated = frontmatterFromTokens(tokens, readComponents(html));
  const existing = {
    components: { "button-primary": { borderColor: "{colors.ink}" } },
  };
  const owned = ownedKeysOf(
    generated,
    Object.keys(readComponents(html).components)
  );
  const merged = mergeFrontmatter(existing, generated, owned);
  assert.equal(merged.components["button-primary"].borderColor, undefined);
});
