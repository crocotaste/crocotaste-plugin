# Changelog

## 1.0.0

- `branding`: brainstorm a product's brand with the user, shown as directions in the browser, ending in an approved brief.
- `extract`: write the brief of an existing codebase from its tokens, theme, fonts and components.
- `guidelines`: turn the brief into `BRAND.html`, the single-file brand book, and derive `DESIGN.md` from it.
- `mockups`: build HTML mockups of the product's screens from `BRAND.html`, one file per screen with an index.
- `handoff`: wire the design system into `CLAUDE.md` or `AGENTS.md` and `.gitattributes` for every coding agent.
- `install`: install the Crocotaste GitHub App so every pull request is checked against `DESIGN.md`.
- `crocotaste check`: check `BRAND.html` and `DESIGN.md` for broken rules, low contrast and drift.
- `crocotaste tokens`: write the tokens in `BRAND.html` into `DESIGN.md`, merging what is there.
- `crocotaste sync`: bring the mockups in line with the tokens in `BRAND.html`.
- `crocotaste serve`: serve `BRAND.html` and the mockups on localhost, read-only, with live reload.
- `crocotaste fonts`: inline open fonts into `BRAND.html` as base64.
- Examples: two made-up products, each with a brief, a brand book, a `DESIGN.md` and three mockups, published on GitHub Pages.
- Eval cases for `claude plugin eval`: skill routing on plain requests, and the brand book output.
