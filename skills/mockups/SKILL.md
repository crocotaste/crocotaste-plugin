---
name: mockups
description: "Build HTML mockups of the product's screens from BRAND.html, one self-contained file per screen under docs/design/mockups with an index, previewed live and iterated in the chat. Use when the user asks to mock up, prototype or sketch a screen, page, flow or the app's UI, or after crocotaste:guidelines ends."
when_to_use: 'Trigger phrases: "mock up the dashboard", "sketch the settings page", "prototype the onboarding", "show me what the app looks like", "/crocotaste:mockups".'
argument-hint: "[screen name]"
---

# Mockups

A mockup is a picture of a screen, drawn in the brand's own materials: its tokens, its components, its words. It is not a working app. No data loads, no form submits, no route changes; one screen in one file, real enough that the user can judge it and a coding agent can build it.

This skill writes only under `docs/design/mockups/`: one `<screen>.html` per screen and the `index.html` that lists them.

## 1. Start

- If `BRAND.html` is missing, stop and offer `crocotaste:guidelines` first, and before it `crocotaste:branding`, or `crocotaste:extract` when the repo already has UI code: "There is no brand book yet. Should we write it first?"
- Read `BRAND.html` before drawing anything: the tokens block, chapter 07 Components (its markup and the CSS rules for each component's classes in the `<style>`), chapter 06 Iconography, chapter 09 Voice and chapter 10 Responsive. Read `docs/design/brief.md` too, for who uses the product and when.
- If `docs/design/mockups/` already has screens, open `docs/design/mockups/index.html` to see what exists and offer to add to the set or refine a screen.

All commands run from the root of the user's repo.

## 2. Choose the first screen

If the user named a screen, start with it. Otherwise ask one question, with a suggestion of three screens named from the brief: the main screen, the one people return to most, and a form or settings screen. "We could start with Today, Book a slot, or Settings. Which first?"

One screen at a time: build it, preview it, iterate until the user is happy, then the next.

## 3. Build a screen

1. Copy the template under a kebab-case name for the screen. If the file already exists, ask before replacing it.

   ```bash
   mkdir -p docs/design/mockups && cp "${CLAUDE_PLUGIN_ROOT}/skills/mockups/templates/mockup.html" docs/design/mockups/today.html
   ```

2. Set the head:
   - `<title>Screen name · Mockup</title>` becomes the screen's name, keeping ` · Mockup` (the index shows the part before it);
   - `<meta name="description" content="">` gets one line on what the screen is for and who uses it; the index shows it under the name.

3. Build the screen inside `<main>`, replacing the template's comment there.
   - Use the brand's components. Take each component's markup from chapter 07 of `BRAND.html`, and copy its CSS rules from the brand book's `<style>` into the mockup's `<style>`, replacing the template's starter `.btn`, `.input`, `.card` and `.nav` rules where the brand book has its own. Show a component at rest, in the state the screen would really be in.
   - Tokens only. Every color, space, radius, size, shadow and duration is a `var(--…)` from the token block. No raw hex, rgb or px in the screen's CSS; borders use `--border-width`.
   - Icons from chapter 06: copy the `<symbol>` elements the screen needs into an inline `<svg>` at the top of `<body>`, and pair each icon with a word or an accessible label.
   - Words in the brand's voice (chapter 09), with realistic content: real names, real amounts, a full row of a table, not lorem ipsum.
   - Plain HTML and CSS, self-contained. No JavaScript framework, no external request (no CDN, no web font link, no remote image). Keep the template's theme toggle and its small script; add no other script.
   - The faces arrive through the token block's `--font-*` families and the fonts block, both copied from `BRAND.html` by `sync`. Never edit either block by hand.
   - Lay it out for a narrow window too, following chapter 10's breakpoints: nothing clipped, nothing scrolling sideways.

4. Bring the screen in line with the brand book and rebuild the index. Run it after every edit that touches the token or fonts block, after `BRAND.html` changes, after adding a screen, and before every preview.

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/crocotaste.mjs" sync BRAND.html docs/design/mockups
   ```

   It writes the brand book's token and fonts blocks into every screen and rewrites `index.html` from each screen's title and description. Never edit `index.html` by hand; `sync` replaces it every time. A line `skipped <file>: no tokens markers` means that file lost its markers: copy them back from the template.

5. Start the preview once, as a background command (it stays in the foreground until stopped, so never wait on it). It prints one JSON line with the url, opens the index in the browser, reloads on every change, and reuses a preview of the same folder that is already running.

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/crocotaste.mjs" serve docs/design/mockups --open
   ```

   If it fails, open `docs/design/mockups/index.html` directly or give the user the path.

6. Tell the user the screen is up, in one line with the url, and ask one question: "What would you change?" Look at it in light and in dark (the toggle in the corner) before asking.

## 4. Iterate

- Change the mockup file; the preview reloads on its own. Run `sync` again when the change touched tokens or a new screen was added.
- If the user wants something the brand book does not have (a new color, a new component, a new radius), change `BRAND.html` first, through `crocotaste:guidelines` (its check, tokens and review), then run `sync`. A mockup never invents a token.
- When the screen is right, offer the next one from the suggestion, or ask which.

## 5. Living documentation

The mockups are the reference the implementation follows, not a sketch thrown away after. Say so once, when the first screen is approved: "From here, the code follows these mockups. When the design changes, we change the mockup first, then the code."

## 6. Hand-off

When the set is enough, invoke `crocotaste:handoff`.

## Tone

- Plain words. Say "the list is tighter now and the button sits at the bottom", not "we adjusted the vertical rhythm of the collection component".
- No em dashes, no exclamation marks, no process jargon. Speak of the plugin as "we", never "I".
- One question per message. Opinions are welcome when a screen will hurt (two primary buttons, a tap target too small, text over an image); say why in one line, then let the user decide.
