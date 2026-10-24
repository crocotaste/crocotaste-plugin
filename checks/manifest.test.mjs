import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

function readJson(path) {
  return JSON.parse(readFileSync(new URL(path, root), "utf8"));
}

test("plugin.json names the plugin crocotaste with a semver version", () => {
  const plugin = readJson(".claude-plugin/plugin.json");
  assert.equal(plugin.name, "crocotaste");
  assert.match(plugin.version, /^\d+\.\d+\.\d+$/);
  assert.ok(plugin.description);
  assert.ok(plugin.author.name);
  assert.equal(plugin.homepage, "https://www.crocotaste.com");
  assert.ok(plugin.repository);
  assert.equal(plugin.license, "MIT");
  assert.ok(plugin.keywords.length >= 4);
});

test("marketplace.json is the same plugin from this repo", () => {
  const plugin = readJson(".claude-plugin/plugin.json");
  const marketplace = readJson(".claude-plugin/marketplace.json");
  assert.equal(marketplace.name, "crocotaste");
  assert.ok(marketplace.owner.name);
  assert.equal(marketplace.plugins[0].name, "crocotaste");
  assert.equal(marketplace.plugins[0].source, "./");
  // plugin.json is the one source of the version.
  assert.equal(marketplace.plugins[0].version, undefined);
  assert.ok(plugin.version);
});

test("every skill folder has a SKILL.md and no other folder is a skill", () => {
  const folders = readdirSync(new URL("skills/", root), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(folders, [
    "branding",
    "extract",
    "guidelines",
    "handoff",
    "install",
    "mockups",
  ]);
  for (const folder of folders) {
    assert.ok(existsSync(new URL(`skills/${folder}/SKILL.md`, root)), folder);
  }
});
