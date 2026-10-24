---
name: extract
description: "Write the brand brief of an existing codebase by reading its tokens, theme, fonts and components, flagging what is inconsistent, so the design system can be written down. Use when the user asks to document the design system, write a DESIGN.md for this repo, extract the brand or the tokens, or asks what the current brand is."
when_to_use: 'Trigger phrases: "document our design system", "write a DESIGN.md for this repo", "extract the brand", "extract the tokens", "what is our current brand", "what colors and fonts do we use", "/crocotaste:extract".'
---

# Extract

The brand is already in the code; our job is to read it faithfully and write it down. Report what is there, not what we would prefer. Where the code disagrees with itself, we do not pick a winner: we show the competing values and ask the user to settle each one. The result is the same brand brief that `crocotaste:branding` writes, at `docs/design/brief.md`, plus what we found and where.

Read only. Never edit the user's code, stylesheets or config in this skill.

## 1. Start

- If `docs/design/brief.md` exists, say so and ask: "There is already a brief here. Should we check it against the code, or write a new one from the code?" Never overwrite it without a yes.
- If the repo has no UI code at all (no stylesheet, no theme, no components), say so and offer `crocotaste:branding` instead.
- Tell the user in one line what you are about to do: "We will read the theme, the fonts and the most used components, then show you what we found."

## 2. Read

Follow `references/what-to-read.md`, in its order. It lists every place a brand hides (Tailwind config and `@theme`, CSS custom properties, theme files, `next/font` or `@font-face`, the component library, the most used components by import count, logo files in `public/`) and the exact searches to find them.

An existing `DESIGN.md` or `BRAND.html` is input, not truth: read it, then check each value it states against the code. Where they differ, it is an inconsistency.

As you read, keep a list of every value with the file and line it came from. Every claim in the brief must trace back to a path.

## 3. Write the brief

Create `docs/design` if needed and write `docs/design/brief.md` with these sections, in this order:

1. `# Brand brief: <product name>` (the name from `package.json`, the README or the app's `<title>`).
2. `## Product and people`: what the product is and who uses it, from the README and the app's copy. Mark what you inferred as inferred.
3. `## Feel`: three words that describe what the code actually looks like, and why (dense tables, 4px corners, one blue: "exact, dense, plain").
4. `## References and what was taken`: an existing `DESIGN.md` or `BRAND.html` and any library the look comes from (for example "shadcn/ui defaults, retuned"). Write "None found" if there is none.
5. `## Color`: each role with its hex in light and in dark, the token name that holds it, and what primary and accent are used for in the code.
6. `## Type`: the display, body and mono faces with their fallback stacks, how they are loaded, the sizes and weights actually in use.
7. `## Shape and density`: the radii, border weight and spacing scale in use.
8. `## Motion`: the durations and easing in use, or "Barely any".
9. `## Voice`: how the interface speaks, with two lines quoted from the UI copy.
10. `## Rejected, with reasons`: leave as "Nothing yet" unless the user rejects something during this skill.
11. `## Found in the code`: one bullet per token source, each with its path and what it holds: "`app/globals.css`: 24 color variables in `:root` and `.dark`, the radius scale." Then the top ten components by import count with their paths and counts, and the logo files found.
12. `## Inconsistencies`: one entry per conflict. Each entry names the role, lists every competing value with its path and how often it appears, and ends with one question:

    ```markdown
    ### Primary blue

    - `#2563eb` in `tailwind.config.ts` (`primary`), used in 41 files
    - `#3b82f6` hard-coded in `components/button.tsx` and 6 others

    Which blue is the primary: `#2563eb`, `#3b82f6`, or a new one?
    ```

What counts as an inconsistency: two values for one role, hard-coded colors or sizes that bypass the tokens, more than two display faces, a radius scale with near duplicates (6px and 8px both used for cards), a dark theme missing roles the light theme has, text on background pairs that look low in contrast.

## 4. Settle each inconsistency

Play back the brief in a few lines (the feel words, the palette, the faces, the shape, the number of inconsistencies), then go through `## Inconsistencies` one at a time:

- Ask the entry's question, one per message. Offer the competing values as the menu, with "or a new one".
- Write the answer into the brief's section for that role, and replace the entry's question with "Settled: <answer>".
- If a choice discards a value, add it under `## Rejected, with reasons` with the user's reason.
- If the user wants to rethink the look rather than settle it, offer `crocotaste:branding` and pass the brief along as the starting point.

When every entry is settled, ask: "Is this the brand? Say yes, or what to change." Wait for an explicit yes.

## 5. Hand-off

Once the brief is approved, invoke `crocotaste:guidelines`.

## Tone

- Plain words, exact paths, real counts. "41 files", not "widely used".
- No judgment of the existing design: describe it. The user decides what changes.
- No em dashes, no exclamation marks, no process jargon. Speak of the plugin as "we", never "I".
