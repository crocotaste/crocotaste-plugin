# AGENTS.md

This repo is a Claude Code plugin that helps a team make its brand, design guidelines and mockups with their coding agent. It then hands the result to Crocotaste, the app that keeps every pull request on-system.

For contributors and coding agents working on the plugin itself, not for people who use it.

## Map

| Path        | What                                                        |
| ----------- | ----------------------------------------------------------- |
| `skills/`   | the six skills, one folder each with a `SKILL.md`           |
| `scripts/`  | the command line tool the skills call, with no dependencies |
| `checks/`   | tests for the repo's own rules (manifests, skills, copy)    |
| `evals/`    | eval cases for the skills, written here and run by hand     |
| `examples/` | sample output of the skills                                 |

## Commands

```bash
npm ci               # install; also switches on the Git hooks
npm run check        # format:check, then the tests
npm run format       # Prettier
npm run validate     # claude plugin validate --strict
```

`npm test` runs `node --test checks/*.test.mjs` for now (Node 24 reads a bare directory as a module). The CLI tasks add `scripts/test/` to it when that folder exists.

## Constraints

- Zero runtime dependencies. Prettier is the only devDependency. Node 20 or newer, ES modules, `node --test`.
- No em dashes and no exclamation marks in prose: skills, templates, README, output copy.
- Nothing personal and nothing secret in the repo: no keys, no home-folder paths.
- Never credit an AI tool as an author, in commits, pull requests or files.
- Conventional commits: `feat(scripts): ...`, `chore: ...`, `docs: ...`.
- Trunk-based: `main` is always green and only moves through a pull request.
- Every `SKILL.md` stays under 500 lines.

## How to work

1. Branch from an up-to-date `main` (`feat/...`, `fix/...`, `docs/...`).
2. Make the change, with its test first.
3. Run `npm run check` and read the result.
4. Open a pull request against `main`. Never push to `main`.
