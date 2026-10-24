import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EVALS = join(ROOT, "evals");

// The keys `claude plugin eval` documents for prompt.md; an unknown key is a
// load error there, so a typo here would only show up on the owner's first run.
const PROMPT_KEYS = new Set([
  "schema_version",
  "name",
  "description",
  "tags",
  "plugins",
  "runs",
  "expected_outcome",
  "model",
  "max_turns",
  "timeout_seconds",
  "allowed_tools",
  "append_system_prompt",
  "env",
]);
const REQUIRED_KEYS = ["runs", "max_turns", "timeout_seconds", "tags"];
const GRADER_TYPES = new Set([
  "regex",
  "tool_used",
  "tool_order",
  "file_exists",
  "llm",
  "baseline",
]);
const COMMON_FIELDS = ["type", "weight", "arm"];
const GRADER_FIELDS = {
  tool_used: ["tool", "input_match", "min", "max"],
  regex: ["pattern", "flags", "match", "target"],
  file_exists: ["path", "exists"],
  llm: ["criteria", "focus"],
};
const NO_TRIGGER = ["build-todo-no-trigger", "fix-bug-no-trigger"];

function caseFolders() {
  if (!existsSync(EVALS)) return [];
  return readdirSync(EVALS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "results")
    .map((entry) => entry.name)
    .filter(
      (name) =>
        existsSync(join(EVALS, name, "prompt.md")) ||
        existsSync(join(EVALS, name, "case.yaml"))
    );
}

function frontmatter(path) {
  const text = readFileSync(path, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  assert.ok(match, `${path} has no frontmatter`);
  const keys = {};
  for (const line of match[1].split("\n")) {
    const key = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (key) keys[key[1]] = key[2].trim();
  }
  return { keys, body: match[2] };
}

function graders(name) {
  const dir = join(EVALS, name, "graders");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => ({ file, ...frontmatter(join(dir, file)) }));
}

test("there are eval cases to check", () => {
  assert.ok(caseFolders().length > 0, "evals/ has no case folders yet");
});

test("every case has a prompt.md with the four run keys and only documented keys", () => {
  for (const name of caseFolders()) {
    const path = join(EVALS, name, "prompt.md");
    assert.ok(existsSync(path), `${name} has no prompt.md`);
    const { keys, body } = frontmatter(path);
    for (const key of REQUIRED_KEYS) {
      assert.ok(key in keys, `${name} prompt.md has no ${key}`);
    }
    for (const key of Object.keys(keys)) {
      assert.ok(PROMPT_KEYS.has(key), `${name} prompt.md has unknown ${key}`);
    }
    assert.ok(body.trim().length > 0, `${name} has an empty prompt`);
  }
});

test("a case that has a case.yaml names its schema version and name", () => {
  for (const name of caseFolders()) {
    const path = join(EVALS, name, "case.yaml");
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    assert.match(text, /^schema_version: "1\.1"$/m, `${name} schema_version`);
    assert.match(text, /^name: \S+$/m, `${name} has no name`);
    const script = text.match(/^\s+scaffold_script:\s*(\S+)$/m);
    if (script) {
      assert.ok(
        existsSync(join(EVALS, name, script[1])),
        `${name} scaffold script ${script[1]} is missing`
      );
    }
  }
});

test("every case has at least one grader with a documented type", () => {
  for (const name of caseFolders()) {
    const found = graders(name);
    assert.ok(found.length > 0, `${name} has no grader`);
    for (const grader of found) {
      assert.ok(
        GRADER_TYPES.has(grader.keys.type),
        `${name}/${grader.file} has type ${grader.keys.type}`
      );
    }
  }
});

test("every grader uses only the fields its type documents", () => {
  for (const name of caseFolders()) {
    for (const grader of graders(name)) {
      const allowed = [
        ...COMMON_FIELDS,
        ...(GRADER_FIELDS[grader.keys.type] ?? []),
      ];
      for (const key of Object.keys(grader.keys)) {
        assert.ok(
          allowed.includes(key),
          `${name}/${grader.file} has ${key} for type ${grader.keys.type}`
        );
      }
    }
  }
});

test("only guidelines-output uses an llm grader", () => {
  for (const name of caseFolders()) {
    const llm = graders(name).filter((g) => g.keys.type === "llm");
    if (name === "guidelines-output") {
      assert.ok(llm.length > 0, "guidelines-output has no llm grader");
    } else {
      assert.equal(llm.length, 0, `${name} uses an llm grader`);
    }
  }
});

test("the two no-trigger cases assert that no crocotaste skill fires", () => {
  for (const name of NO_TRIGGER) {
    assert.ok(caseFolders().includes(name), `${name} is missing`);
    const guard = graders(name).find(
      (g) =>
        g.keys.type === "tool_used" &&
        g.keys.min === "0" &&
        g.keys.max === "0" &&
        g.keys.arm === "both"
    );
    assert.ok(guard, `${name} has no tool_used grader with min 0 and max 0`);
  }
});

test("evals/README.md states the cost line and the command", () => {
  const readme = join(EVALS, "README.md");
  assert.ok(existsSync(readme), "evals/README.md is missing");
  const text = readFileSync(readme, "utf8");
  assert.match(text, /cost money/i);
  assert.match(text, /CI never runs them/i);
  assert.ok(
    text.includes(
      "claude plugin eval . --allow-tools Bash Write Edit --max-cost-usd 10 --no-publish --scaffold"
    ),
    "the README does not hold the run command"
  );
});
