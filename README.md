# Crocotaste plugin

A Claude Code plugin for your brand, design guidelines and mockups, made with your coding agent. Then Crocotaste keeps every pull request on-system.

## Install

The short form, one command from your shell (Claude Code 2.1.292 or later):

```bash
claude plugin install crocotaste --marketplace crocotaste/crocotaste-plugin
```

The two-step form, inside a Claude Code session:

```text
/plugin marketplace add crocotaste/crocotaste-plugin
/plugin install crocotaste@crocotaste
```

Then start with `/crocotaste:branding` for a new product, or `/crocotaste:extract` for a codebase that already has a look.

## What you get

```text
branding --> guidelines --> mockups --> handoff --> install
               ^
extract -------+
```

- `/crocotaste:branding`: brainstorm the brand with you, the feel, references, palette, type and shape, shown as directions in the browser, ending in an approved brief.
- `/crocotaste:extract`: write the brief of an existing codebase by reading its tokens, theme, fonts and components, and flag what is inconsistent.
- `/crocotaste:guidelines`: turn the brief into `BRAND.html`, a single-file visual brand book, and derive `DESIGN.md` from it, both reviewed before you see them.
- `/crocotaste:mockups`: build HTML mockups of your screens from `BRAND.html`, one file per screen with an index, previewed live.
- `/crocotaste:handoff`: wire the design system into the repo for every coding agent, through `CLAUDE.md` or `AGENTS.md` and `.gitattributes`.
- `/crocotaste:install`: install the Crocotaste GitHub App so every pull request is checked against `DESIGN.md`.

Each skill names the next one when it ends. You can also call any step on its own.

The files it writes in your repo:

```text
BRAND.html                     the brand book, where the tokens live
DESIGN.md                      the design system, for agents and for review
docs/design/brief.md           the approved brief
docs/design/mockups/*.html     one mockup per screen, and an index
CLAUDE.md or AGENTS.md         one marked block that points agents at the design system
.gitattributes                 two lines that mark BRAND.html and the mockups as generated
```

## How it works

- The tokens live once, in `BRAND.html`. A small script derives the rest: the `DESIGN.md` frontmatter and the tokens inside every mockup.
- The script checks the brand book for broken rules, missing tokens and components, and low contrast, and serves a read-only live preview on localhost.
- Your files stay on your machine. The script makes one kind of network request: `fonts` downloads open fonts from Google Fonts when you ask. The skills may also run `npx @google/design.md` and `gh api`, and the directions page loads its faces from Google Fonts. No account is needed, and the script has no dependencies.
- A file that exists is never overwritten silently. The skills ask first, and the decisions you wrote in `DESIGN.md` are kept word for word.

## Then Crocotaste

Crocotaste reviews every pull request against your `DESIGN.md` and posts cited findings with ready-made fixes. [How it works with the plugin](https://www.crocotaste.com).

## Examples

Two made-up products, each with a brief, a brand book, a `DESIGN.md` and three mockups, all made with these skills: [crocotaste.github.io/crocotaste-plugin](https://crocotaste.github.io/crocotaste-plugin/). The files are in [`examples/`](examples/).

## Other agents

The skills are plain `SKILL.md` folders, so other coding agents can load them too. Untested so far:

```bash
npx skills add crocotaste/crocotaste-plugin
```

## Development

```bash
npm install          # also switches on the Git hooks
npm run check        # Prettier, then the tests
npm run validate     # claude plugin validate --strict
```

The eval cases are in [`evals/`](evals/README.md). Running them calls the model and costs money, so CI never runs them.

Contributing: [CONTRIBUTING.md](CONTRIBUTING.md). Security: [SECURITY.md](SECURITY.md). Changes: [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE)
