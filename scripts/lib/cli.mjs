const COMMANDS = new Map([
  [
    "check",
    {
      summary: "Check BRAND.html and DESIGN.md for broken rules and drift",
      usage: "crocotaste check [--json]",
      load: () => import("../commands/check.mjs"),
    },
  ],
  [
    "tokens",
    {
      summary:
        "Write the tokens in BRAND.html into DESIGN.md, merging what is there",
      usage: "crocotaste tokens <BRAND.html> <DESIGN.md> --write | --print",
      load: () => import("../commands/tokens.mjs"),
    },
  ],
  [
    "sync",
    {
      summary: "Bring the mockups in line with the tokens in BRAND.html",
      usage: "crocotaste sync",
      load: () => import("../commands/sync.mjs"),
    },
  ],
  [
    "serve",
    {
      summary: "Serve BRAND.html and the mockups on localhost",
      usage: "crocotaste serve [--port <n>]",
      load: () => import("../commands/serve.mjs"),
    },
  ],
  [
    "fonts",
    {
      summary: "Find a font and embed it in BRAND.html",
      usage: "crocotaste fonts <family>",
      load: () => import("../commands/fonts.mjs"),
    },
  ],
]);

function helpText() {
  const width = Math.max(...[...COMMANDS.keys()].map((name) => name.length));
  const lines = ["Usage: crocotaste <command> [options]", "", "Commands:"];
  for (const [name, { summary }] of COMMANDS) {
    lines.push(`  ${name.padEnd(width)}  ${summary}`);
  }
  lines.push(`  ${"help".padEnd(width)}  Show this text`, "", "Usage of each:");
  for (const { usage } of COMMANDS.values()) lines.push(`  ${usage}`);
  return `${lines.join("\n")}\n`;
}

async function run(argv, io = defaultIo()) {
  const [name, ...args] = argv;
  if (
    name === undefined ||
    name === "help" ||
    name === "--help" ||
    name === "-h"
  ) {
    io.stdout.write(helpText());
    return 0;
  }
  const command = COMMANDS.get(name);
  if (!command) {
    io.stderr.write(`Unknown command: ${name}\n\n`);
    io.stdout.write(helpText());
    return 2;
  }
  let module;
  try {
    module = await command.load();
  } catch (error) {
    // Only a missing command file is ours to explain; a broken one must surface.
    if (
      error?.code !== "ERR_MODULE_NOT_FOUND" ||
      !String(error.message).includes("commands/")
    ) {
      throw error;
    }
    io.stderr.write(`The ${name} command is not available in this version.\n`);
    return 1;
  }
  return module.run(args, io);
}

function defaultIo() {
  return {
    stdout: process.stdout,
    stderr: process.stderr,
    cwd: process.cwd(),
    fetch: globalThis.fetch,
  };
}

export { run };
