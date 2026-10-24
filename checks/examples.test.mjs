import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkBrandBook } from "../scripts/commands/check.mjs";
import {
  parseTokens,
  readBlock,
  readTokenBlock,
} from "../scripts/lib/css-tokens.mjs";
import {
  frontmatterFromTokens,
  mergeFrontmatter,
  ownedKeysOf,
  readComponents,
  readTitle,
  splitDesignMd,
} from "../scripts/lib/design-md.mjs";
import { parseYaml } from "../scripts/lib/yaml.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXAMPLES = join(ROOT, "examples");
const SAMPLES = JSON.parse(
  readFileSync(join(ROOT, "scripts/lib/template-samples.json"), "utf8")
);

// Built from its code point so this file never contains the character.
const EM_DASH = String.fromCharCode(0x2014);

function read(path) {
  return readFileSync(path, "utf8");
}

function examples() {
  if (!existsSync(EXAMPLES)) return [];
  return readdirSync(EXAMPLES, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(join(EXAMPLES, entry.name, "BRAND.html"))
    )
    .map((entry) => entry.name)
    .sort();
}

function screensOf(slug) {
  const dir = join(EXAMPLES, slug, "mockups");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".html") && file !== "index.html")
    .sort();
}

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

test("there is at least one example", () => {
  assert.ok(examples().length > 0, "examples/ holds no brand");
});

for (const slug of examples()) {
  const dir = join(EXAMPLES, slug);
  const brandPath = join(dir, "BRAND.html");

  test(`${slug}: the five paths exist`, () => {
    for (const file of [
      "brief.md",
      "BRAND.html",
      "DESIGN.md",
      "mockups/index.html",
    ]) {
      assert.ok(existsSync(join(dir, file)), `${slug}/${file} is missing`);
    }
    assert.ok(screensOf(slug).length > 0, `${slug} has no mockup screen`);
  });

  test(`${slug}: the brand book passes check with every spot filled`, () => {
    const { problems } = checkBrandBook(read(brandPath), { samples: SAMPLES });
    assert.deepEqual(problems, []);
  });

  test(`${slug}: the DESIGN.md frontmatter is what tokens derives`, () => {
    const html = read(brandPath);
    const tokens = parseTokens(readTokenBlock(html).css);
    const componentMap = readComponents(html);
    const { frontmatter } = splitDesignMd(read(join(dir, "DESIGN.md")));
    assert.ok(frontmatter !== null, `${slug}/DESIGN.md has no frontmatter`);
    const existing = parseYaml(frontmatter);
    const generated = {
      ...frontmatterFromTokens(tokens, componentMap),
      name: readTitle(html),
    };
    const ownedKeys = ownedKeysOf(
      generated,
      Object.keys(componentMap.components)
    );
    assert.deepEqual(
      mergeFrontmatter(existing, generated, ownedKeys),
      existing
    );
  });

  test(`${slug}: every mockup carries the brand book's tokens and fonts`, () => {
    const brand = read(brandPath);
    const tokens = readBlock(brand, "tokens").css;
    const fonts = readBlock(brand, "fonts").css;
    for (const file of [...screensOf(slug), "index.html"]) {
      const html = read(join(dir, "mockups", file));
      assert.equal(readBlock(html, "tokens").css, tokens, `${file}: tokens`);
      assert.equal(readBlock(html, "fonts").css, fonts, `${file}: fonts`);
    }
  });

  test(`${slug}: no em dash and no home path in any file`, () => {
    for (const path of filesUnder(dir)) {
      const text = read(path);
      const name = path.slice(ROOT.length);
      assert.ok(!text.includes(EM_DASH), `${name} has an em dash`);
      assert.ok(!/\/Users\/|\/home\//.test(text), `${name} has a home path`);
    }
  });

  test(`${slug}: every file is under 1 MB`, () => {
    for (const path of filesUnder(dir)) {
      assert.ok(
        statSync(path).size < 1024 * 1024,
        `${path.slice(ROOT.length)} is over 1 MB`
      );
    }
  });
}

test("the examples index links each brand book and its mockups", () => {
  const indexPath = join(EXAMPLES, "index.html");
  assert.ok(existsSync(indexPath), "examples/index.html is missing");
  const html = read(indexPath);
  for (const slug of examples()) {
    for (const href of [`${slug}/BRAND.html`, `${slug}/mockups/index.html`]) {
      assert.ok(
        new RegExp(`href=(["'])(\\./)?${href}\\1`).test(html),
        `index.html does not link ${href}`
      );
    }
  }
});
