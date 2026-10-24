# AGENTS.md

This repo is a Claude Code plugin that helps a team make its brand, design guidelines and mockups with their coding agent. It then hands the result to Crocotaste, the app that keeps every pull request on-system.

For contributors and coding agents working on the plugin itself, not for people who use it. People who use it read `README.md`; the long form of these rules is `CONTRIBUTING.md`.

## Map

| Path              | What                                                                     |
| ----------------- | ------------------------------------------------------------------------ |
| `.claude-plugin/` | `plugin.json`, `marketplace.json` and the icon                           |
| `skills/`         | the six skills, one folder each with a `SKILL.md`, references, templates |
| `scripts/`        | `crocotaste.mjs`, the command line tool the skills call, and its tests   |
| `checks/`         | tests for the repo's own rules (manifests, skills, copy, guards)         |
| `evals/`          | eval cases for the skills, written here and run by hand                  |
| `examples/`       | two products made with the skills, published on GitHub Pages             |
| `.githooks/`      | the commit hooks that run the guards                                     |
| `.github/`        | CI, the Pages workflow, the pull request and issue templates             |

## Commands

```bash
npm ci               # install; also switches on the Git hooks
npm run check        # format:check, then the tests
npm run format       # Prettier
npm run validate     # claude plugin validate --strict
node scripts/crocotaste.mjs help   # check, tokens, sync, serve, fonts
```

`npm test` runs `node --test checks/*.test.mjs scripts/test/*.test.mjs`: the repo rules, then the command line tool. The evals (`evals/README.md`) call the model and cost money; CI never runs them.

## Constraints

- Zero runtime dependencies. Prettier is the only devDependency. Node 20 or newer, ES modules, `node --test`.
- No SessionStart hook and no `.mcp.json`. The plugin is skills and one script.
- No prices and no dates about the Crocotaste offer anywhere in the plugin, and nothing about its internals.
- Never overwrite a user's file silently: `tokens` merges, skills ask before writing a file that exists, `## Decisions` is kept verbatim.
- The plugin writes only its own files in a user's repo: `BRAND.html`, `DESIGN.md`, `docs/design/`, one block in `CLAUDE.md` or `AGENTS.md`, two lines in `.gitattributes`.
- No em dashes and no exclamation marks in prose: skills, templates, README, output copy.
- Nothing personal and nothing secret in the repo: no keys, no home-folder paths, no emails of people.
- Never credit an AI tool as an author, in commits, pull requests or files.

## How to work

1. Branch from an up-to-date `main` (`feat/...`, `fix/...`, `docs/...`, `chore/...`).
2. Make the change, with its test first.
3. Run `npm run check` and read the result; run `npm run validate` when a manifest or skill changed.
4. Commit with a conventional message (`feat(scripts): ...`, `fix(skills): ...`, `docs: ...`) and no trailer.
5. Open a pull request against `main` with the template. Never push to `main`, never force-push, never `--no-verify`.
6. Docs are part of the change: fix the README, this file, `CONTRIBUTING.md` or a skill in the same pull request.

## Writing a skill

- One folder, `skills/<name>/`, with a `SKILL.md`; the name is one plain word.
- Frontmatter keys: `name`, `description`, `when_to_use`, and `argument-hint` when it takes an argument.
- Under 500 lines. Detail goes into `references/`, files to copy into `templates/`.
- A test in `checks/`, and the folder added to `checks/manifest.test.mjs`.
- Plain words, one question at a time, neutral "we" when the plugin speaks of itself. End by naming the next skill.

## Claude Code

- Claude Code reads this file directly; there is no `CLAUDE.md` here, because `claude plugin validate --strict` flags one at a plugin's root.
- No edit hook formats files here. Run `npm run format` before you commit.
- `.claude/settings.json` denies skipping the Git hooks, changing `core.hooksPath` and editing `.githooks/`.
