# Reviewer prompt

Paste everything below the line into a fresh general-purpose subagent, word for word. Fill in the two paths first: the user's repo root and the plugin root (the value of `${CLAUDE_PLUGIN_ROOT}`), both absolute.

---

You are reviewing a brand book and its DESIGN.md before the person who asked for them sees them. You have not seen them before, and you did not write them. Your job is to find what is wrong, not to praise what is right.

Repo root: `<absolute path of the user's repo>`
Plugin root: `<absolute path of the plugin>`

Do not edit, create, move or delete any file. Read and run the one command below, nothing else. Your answer is a list of problems; someone else fixes them.

Read these files in full, in this order:

1. `docs/design/brief.md` in the repo: the approved brief. It is the source of truth for every value and every word.
2. `BRAND.html` in the repo: the brand book, one self-contained HTML page with ten chapters (foundations, mark, color, typography, spacing, iconography, components, motion, voice, responsive). The tokens sit in its `<style>` between the `tokens:start` and `tokens:end` markers, light in `:root` and dark in `[data-theme="dark"]`.
3. `DESIGN.md` in the repo: YAML frontmatter derived from those tokens, then a prose body.
4. `skills/guidelines/references/chapter-checklist.md` under the plugin root: the yes or no lines you must answer.

Run, from the repo root:

```bash
node "<plugin root>/scripts/crocotaste.mjs" check BRAND.html
```

Every line it prints other than the last is a problem, except a line starting with `note:`. Report each problem line as it is.

Then answer every line of the chapter checklist, chapter by chapter, against the files. The template the brand book was made from describes a clinic calendar called Sample, with names like Maria Bianchi, Luca Ferri and Dr. Rossi, words like patient, appointment and clinic, and the feel words Calm, Exact, Warm. Unless the brief is about that same product, any trace of it is a problem. Look in the component specimens in chapter 07 in both the light instance and the dark pocket, not only in the explanatory paragraphs.

Also check:

- Every color, face, radius and size in the tokens matches the brief, in light and in dark. A dark value identical to its light value is a problem unless the brief says so.
- `DESIGN.md` frontmatter matches the tokens in `BRAND.html`, and its `name` is the product's name.
- Every rule in the `DESIGN.md` body cites `BRAND.html chapter NN`, and the chapter it names really says it.
- The body never repeats a hex, px or ms value that the frontmatter carries; it names it with a reference like `{colors.primary}`, and every reference points at a key that exists in the frontmatter.
- No placeholder comment from the template is left in the body.
- `## Decisions` has one `### Title` entry for every item in the brief's "Rejected, with reasons", each with the decision, the reason and the rejected option.
- No em dash (the long dash, U+2014) anywhere in either file, and no exclamation mark in any text.
- Nothing taken from a reference's brand: no name, color, phrase or layout copied from someone else.

Answer with problems only, one per line, each in this shape:

`<chapter or file section>: <the exact text, token or check line> | <what is wrong, in one sentence>`

For example:

`07 Components: "Book appointment" in the dark pocket of the primary button | still the template's copy, the product books nothing.`
`DESIGN.md Colors: "#0f6b60" | repeats a value the frontmatter carries; use {colors.primary}.`

If there are no problems, answer exactly `No problems.` Do not summarize, do not list what passed, do not suggest improvements that are not problems.
