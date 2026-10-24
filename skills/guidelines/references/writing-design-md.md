# Writing the DESIGN.md body

`DESIGN.md` is the brand book as plain text, for coding agents and reviewers. The `tokens` command writes the frontmatter: `colors` (light keys, and dark ones prefixed `dark-`), `spacing`, `rounded`, `typography` and `components`. The body is ours to write. It says how to use those values, never what they are.

## Rules for every line

- Prose bullets, one rule per bullet, short and concrete. A rule says what to do, where, and when not to.
- Every bullet ends by citing its source: `(BRAND.html chapter 03)`. Cite the chapter that really says it; if no chapter says it, it does not belong here, or the chapter needs the line first.
- Name a value by reference to its frontmatter key, never by repeating it: `{colors.primary}`, `{colors.dark-primary}`, `{spacing.4}`, `{rounded.md}`, `{typography.body}`, `{components.button-primary}`. A hex, a px or a font size that the frontmatter carries never appears in the body. Values the frontmatter does not carry (motion durations, easing, shadows, border widths) are named by their token in `BRAND.html`: `--motion-fast`, `--shadow-md`.
- Use the product's words, the same ones the brand book uses. No sample copy, no generic advice ("use whitespace wisely").
- Replace every placeholder comment the `tokens` command left. On an existing file, edit the sections in place and keep anything the user wrote that is still true.

## The sections, in order

The `tokens` command writes these headings on a new file; keep them in this order and add the three marked new before `## Decisions`.

| Section                | What it holds                                                                   | Source chapters |
| ---------------------- | ------------------------------------------------------------------------------- | --------------- |
| `## Overview`          | The product in one line, the three feel words, the principles and the mark rule | 01, 02          |
| `## Colors`            | What each role is for, what primary and accent are never for, dark mode rules   | 03              |
| `## Typography`        | Which face for what, the scale steps and when to use each, numbers and length   | 04              |
| `## Layout`            | The spacing steps and where each is used, density, the breakpoints' changes     | 05, 10          |
| `## Elevation & Depth` | What floats and which shadow it gets, borders instead of shadows elsewhere      | 05              |
| `## Shapes`            | Which radius goes on what, and where corners are never rounded                  | 05              |
| `## Components`        | One bullet per component that needs a rule beyond its frontmatter entry         | 07              |
| `## Do's and Don'ts`   | The voice chapter's do and don't pairs, as real strings                         | 09              |
| `## Motion` (new)      | Where motion appears, which duration, and that it stops with reduced motion     | 08              |
| `## Voice` (new)       | How the product speaks, the words it uses and the words it never uses           | 09              |
| `## Responsive` (new)  | What changes at each breakpoint, target size, focus, contrast                   | 10              |
| `## Decisions`         | Every decision taken and every option rejected, with the reason                 | the brief       |

If `npx @google/design.md lint` reports one of the three new sections as unknown or misplaced, move its bullets into the closest standard section (Motion into Components, Voice into Do's and Don'ts, Responsive into Layout) rather than dropping them.

## Decisions

`## Decisions` is the team's memory: the reason a choice was made, so nobody undoes it by accident. Take one entry per item in the brief's "Rejected, with reasons", and add one for every decision the user makes later in the chat.

- Each entry is a `### Title` naming the decision in a few words, then three short lines: the decision, the reason, and the rejected option.
- On an existing DESIGN.md, never edit or remove an entry that is already there. Add new ones below it.

## Example

For a reading app whose brief chose a warm green and turned down a blue:

```markdown
## Colors

- `{colors.primary}` marks the one thing to do next on a screen: Start reading, Save highlight. Never a heading, never a link inside text (BRAND.html chapter 03).
- `{colors.accent}` is for highlights a reader made, and nothing else (BRAND.html chapter 03).
- In dark mode text sits on `{colors.dark-canvas}`, never on pure black, and the primary becomes `{colors.dark-primary}` (BRAND.html chapter 03).

## Decisions

### Green, not blue, for the primary

- Decision: the primary is the warm green in `{colors.primary}`.
- Reason: readers open the app at night to wind down; the green reads as calm, blue read as work.
- Rejected: the bright blue from the first direction.
```
