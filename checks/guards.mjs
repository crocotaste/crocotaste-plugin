import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const MAX_BYTES = 1_048_576;

// Patterns are assembled from parts so this file never matches itself.
const TOOLS = "claude|chatgpt|copilot|gemini|cursor|codex";
const SAFE_HOSTS = "localhost|127\\.0\\.0\\.1|db|host\\.docker\\.internal";

const PATTERNS = [
  ["a private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["a GitHub token", /\b(?:ghp_|gho_|github_pat_)[A-Za-z0-9_]{36,}/],
  ["an Anthropic key", /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ["an API key", /\bsk-[A-Za-z0-9]{32,}/],
  ["an AWS access key", /\bAKIA[0-9A-Z]{16}/],
  ["a Slack token", /\bxox[abp]-[0-9A-Za-z-]{10,}/],
  [
    "a database url with a password",
    new RegExp(
      `postgres(?:ql)?:\\/\\/[^:\\s/]+:[^@\\s]{9,}@(?!(?:${SAFE_HOSTS})(?:[:/?\\s]|$))`,
      "i"
    ),
  ],
  [
    "a home folder path",
    /\/(?:Users|home)\/[^\s/]+\/|[A-Za-z]:\\Users\\[^\s\\]+\\/,
  ],
  [
    "an AI attribution line",
    new RegExp(`co-authored-by:.*\\b(?:${TOOLS})\\b`, "i"),
  ],
  [
    "an AI attribution line",
    new RegExp(`generated (?:with|by) (?:${TOOLS})`, "i"),
  ],
];

const COMMIT =
  /^(feat|fix|perf|docs|chore|ci|refactor|test)(\([a-z-]+\))?!?: .+/;

function isBinary(buffer) {
  return buffer.subarray(0, 8192).includes(0);
}

function git(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "buffer",
    maxBuffer: 256 * 1024 * 1024,
  });
}

export function scanText(path, text) {
  const problems = [];
  const lines = text.split("\n");
  for (const [name, pattern] of PATTERNS) {
    const index = lines.findIndex((line) => pattern.test(line));
    if (index !== -1) problems.push(`${path}:${index + 1} looks like ${name}`);
  }
  return problems;
}

export function committableFiles(root) {
  const out = git(root, [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ]).toString("utf8");
  return [...new Set(out.split("\0").filter(Boolean))].filter(
    (file) => !/(^|\/)(node_modules|\.git)\//.test(file)
  );
}

function scanStaged(root) {
  const names = git(root, [
    "diff",
    "--cached",
    "--name-only",
    "--diff-filter=ACMR",
    "-z",
  ])
    .toString("utf8")
    .split("\0")
    .filter((file) => file && !/(^|\/)(node_modules|\.git)\//.test(file));
  const problems = [];
  for (const file of names) {
    let content;
    try {
      content = git(root, ["show", `:${file}`]);
    } catch {
      console.error(`skipped ${file}: not readable from the index`);
      continue;
    }
    if (content.length > MAX_BYTES) {
      problems.push(`${file} is over 1 MB`);
      continue;
    }
    if (isBinary(content)) continue;
    problems.push(...scanText(file, content.toString("utf8")));
  }
  return problems;
}

function scanMessage(file) {
  const text = readFileSync(file, "utf8");
  // Git strips # lines, so they are not part of the message.
  const lines = text.split("\n").filter((line) => !line.startsWith("#"));
  const problems = scanText("commit message", lines.join("\n"));
  const subject = lines.find((line) => line.trim());
  if (!subject || !COMMIT.test(subject)) {
    problems.push(
      "commit message must be a conventional commit, like `feat(scripts): add a flag`"
    );
  }
  return problems;
}

function main(argv) {
  const [flag, value] = argv;
  let problems;
  if (flag === "--staged") {
    problems = scanStaged(process.cwd());
  } else if (flag === "--message" && value) {
    problems = scanMessage(value);
  } else {
    console.error("usage: guards.mjs --staged | --message <file>");
    return 2;
  }
  for (const problem of problems) console.error(problem);
  return problems.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
