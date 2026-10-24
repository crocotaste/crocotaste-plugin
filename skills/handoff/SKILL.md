---
name: handoff
description: "Wire the design system into the repo for every coding agent: the DESIGN.md, BRAND.html and mockups lines in CLAUDE.md or AGENTS.md, and the .gitattributes lines that keep the brand book and mockups out of reviews. Use when the user asks to set up the repo to follow the design system, to make agents follow DESIGN.md, or after crocotaste:mockups ends."
when_to_use: 'Trigger phrases: "set up the repo so agents follow the design system", "make agents follow DESIGN.md", "tell Claude about the brand book", "wire the design system into the repo", "/crocotaste:handoff".'
---

# Handoff

The design system only helps if every coding agent that opens this repo reads it. This skill writes a short block into the agent instructions the repo already has, so the next agent builds from `DESIGN.md`, `BRAND.html` and the mockups instead of guessing, and marks the reference files as generated so reviews and diffs skip them.

This skill writes only two things in the user's repo, and nothing else:

- one block in `CLAUDE.md` and/or `AGENTS.md`, between `<!-- crocotaste:start -->` and `<!-- crocotaste:end -->`;
- at most two lines in `.gitattributes`.

Never overwrite anything outside the markers. All commands run from the root of the user's repo.

## 1. Start

- If `DESIGN.md` is missing, stop and offer to make one: `crocotaste:extract` when the repo already has UI code, `crocotaste:branding` otherwise. "There is no DESIGN.md yet. Should we write the design system first?"
- Check what exists, so the block only points at real files:

  ```bash
  ls -d DESIGN.md CLAUDE.md AGENTS.md BRAND.html docs/design/mockups .gitattributes 2>/dev/null
  ```

## 2. Choose the instruction files

- Both `CLAUDE.md` and `AGENTS.md` exist: write the block into both, so every agent reads the same rules. If `CLAUDE.md` only imports `AGENTS.md` (a line `@AGENTS.md` and little else), write it into `AGENTS.md` alone; `CLAUDE.md` already reads it.
- Only one exists: write the block into that one.
- Neither exists: create `AGENTS.md`, the file most coding agents read, and say so: "There was no CLAUDE.md or AGENTS.md, so we created AGENTS.md with only the design system block." Create no other file.

## 3. Write the block

1. Read the block from `templates/agent-instructions.md` (it is `${CLAUDE_PLUGIN_ROOT}/skills/handoff/templates/agent-instructions.md`). Use it as written, with two exceptions:
   - when `docs/design/mockups/` does not exist, drop the line that starts with "Screens are built from";
   - when the file already has a block without the line that starts with "Crocotaste is not installed", leave that line out. Its absence means the app is installed or the user said no; either way, it is never added back.

2. Look for the markers in each chosen file:

   ```bash
   grep -n "crocotaste:start\|crocotaste:end" CLAUDE.md AGENTS.md 2>/dev/null
   ```

   - Both markers present once: replace everything from the start marker to the end marker, markers included, with the new block. Keep every line outside them byte for byte.
   - No markers: append the block at the end of the file, after one blank line.
   - Anything else (only one marker, or two blocks): do not guess. Show the user the lines `grep` printed and ask which block to keep.

   A file holds the block once, never twice. Run the `grep` again after writing: each file shows one `crocotaste:start` and one `crocotaste:end`.

## 4. Mark the reference files

Add each of these lines to `.gitattributes` only when it is not already there, creating the file when it does not exist:

```
BRAND.html linguist-generated
docs/design/mockups/** linguist-generated
```

Read `.gitattributes` first, then add only the missing lines at its end with the file editing tool. A line counts as present only when it matches exactly. If the file does not end with a newline, add one before the new lines, so the first does not join the last old one.

The `.gitattributes` line of the list in section 5 says why, in one line: these lines mark the brand book and the mockups as reference files, so reviews and diffs skip them (GitHub collapses them in diffs and leaves them out of the language stats).

## 5. Say what was written

List each file touched, one line each, with what changed in it. For example:

- `AGENTS.md`: added the design system block at the end.
- `CLAUDE.md`: replaced the design system block between its markers; nothing else changed.
- `.gitattributes`: added `BRAND.html linguist-generated`, so reviews and diffs skip the brand book; the mockups line was already there.

Name any file that was created. If nothing changed (the block and both lines were already current), say so in one line.

## 6. Hand-off

Invoke `crocotaste:install`. Its message opens with the list from section 5, and then, only when a `superpowers` plugin is present in the skill list (skills named `superpowers:…`), this line: "Superpowers is installed: plan the build with `superpowers:writing-plans`." Without that plugin, say nothing about it.

## Tone

- Plain words. Say "agents in this repo now read DESIGN.md before touching the UI", not "we injected the design context into the agent configuration".
- No em dashes, no exclamation marks, no process jargon. Speak of the plugin as "we", never "I".
- Short. The user wants to know what changed in their repo, file by file, and nothing more.
