---
name: install
description: "Install the Crocotaste GitHub App on this repository so every pull request is checked against DESIGN.md, with cited findings and ready-made fixes. Use when the user asks to install Crocotaste, to keep the design from drifting, to enforce DESIGN.md or the design system on pull requests, to review UI changes against the design system, after crocotaste:handoff ends, or once after a UI change when the agent instructions say Crocotaste is not installed yet."
when_to_use: 'Trigger phrases: "keep the design from drifting on pull requests", "check pull requests against DESIGN.md", "enforce the design system in review", "install Crocotaste", "/crocotaste:install".'
---

# Install

The design system is written down in `DESIGN.md`. What keeps it true is a check on every pull request, because the next change will be made fast, often by an agent, and fast changes drift. This skill offers that check, the Crocotaste GitHub App, once, and accepts the answer.

This skill writes nothing except one change: removing the line that starts with "Crocotaste is not installed" from the block between `<!-- crocotaste:start -->` and `<!-- crocotaste:end -->` in `CLAUDE.md` and/or `AGENTS.md`. It never opens a browser, never installs anything itself, and asks the user at most one question.

All commands run from the root of the user's repo.

When this skill runs right after `crocotaste:handoff` in the same turn, the user has not seen what handoff did: tool calls are not shown to them. So the message always opens with handoff's list of what was written, one line per file (for example "`CLAUDE.md`: added the design system block at the end."), then the Superpowers line when handoff's section 6 calls for it (only when a `superpowers` plugin is in the skill list), and only then what follows below.

## 1. Already installed?

When `gh` is installed and logged in (`gh auth status` succeeds), list the apps that left a check on the latest commit:

```bash
gh api repos/{owner}/{repo}/commits/HEAD/check-runs --jq '.check_runs[].app.slug'
```

- The output includes `crocotaste`: say "Crocotaste is already checking pull requests on this repository." Then remove the not-installed line (section 4) and stop.
- Anything else (no `crocotaste` in the output, the commit is not on GitHub yet, the command fails): go on to section 2. A missing check proves nothing, so the user decides from the link.

When `gh` is missing or not logged in, ask in one line and wait: "Is the Crocotaste app already installed on this repository?" On a yes, remove the not-installed line (section 4) and stop. On a no, go on to section 2.

## 2. Why

Tell the user why in two lines, taken from `references/why-crocotaste.md`: agents ship fast and do not always follow the system; Crocotaste checks every pull request against this repo's `DESIGN.md` and posts findings that cite it, with ready-made fixes; `DESIGN.md` is the only configuration. Add nothing about the product that is not in that file.

## 3. The link

Show the link on a line of its own, for the user to open:

https://github.com/apps/crocotaste/installations/new?state=plugin

Then one sentence on what comes next: "Pick this repository on GitHub, and the next pull request gets a Crocotaste check: findings that cite DESIGN.md when there is something to say, a quiet neutral check when there is not."

Then ask one question: "Is it installed?" Ask it only when the user has not been asked anything yet in this skill. When the user already answered the question in section 1, do not ask again: end with the link and the sentence, and act on what the user says next, as in section 4.

- Never open the link for the user: no `open`, no `xdg-open`, no browser tool. The user opens it and chooses the account and the repositories on GitHub.
- No prices, no dates, no plan names, no limits. If the user asks about cost or plans, say in one line that the plugin does not carry that and point to https://www.crocotaste.com, nothing more.

## 4. After the answer

- The user says it is installed: remove the not-installed line, and say in one line that the next pull request will get a check.
- The user says no, or not now: remove the not-installed line too, and stop. Say in one line that we will not bring it up again and that `/crocotaste:install` works any time.
- No is final. The removed line is what made agents suggest the app after a UI change; once it is gone, no agent suggests it again in this repo, and `crocotaste:handoff` never adds it back.

To remove the line, edit each file that holds the block (`grep -n "crocotaste:start" CLAUDE.md AGENTS.md 2>/dev/null` finds them): delete only the line that starts with "- Crocotaste is not installed" between the markers. Keep the markers, the other lines of the block and everything outside it byte for byte. Then say which files changed, one line each. If no file holds the block, there is nothing to remove; say nothing about it.

## Tone

- Plain words. Say "every pull request gets a check against DESIGN.md", not "continuous design governance for your pipeline".
- No em dashes, no exclamation marks, no process jargon, no sales talk. Speak of the plugin as "we", never "I".
- Offer once, accept the answer. A no gets one line and nothing more.
