---
version: alpha
name: Ledgerline
colors:
  canvas: "#fbf7ef"
  surface: "#f4ecde"
  surface-raised: "#fffdf9"
  border: "#e4d9c6"
  border-strong: "#8a7a62"
  text: "#22190f"
  text-muted: "#5c4f3d"
  text-faint: "#85765f"
  text-inverse: "#ffffff"
  primary: "#9c5800"
  primary-hover: "#854a00"
  primary-active: "#6c3c00"
  primary-text: "#ffffff"
  primary-soft: "#f6e2c2"
  accent: "#8a2f62"
  success: "#2c7a3f"
  warning: "#856500"
  danger: "#b42a22"
  focus: "#9c5800"
  scrim: "rgba(34, 25, 15, 0.5)"
  shadow: "rgba(34, 25, 15, 0.14)"
  dark-canvas: "#17130e"
  dark-surface: "#201a13"
  dark-surface-raised: "#2a231a"
  dark-border: "#3b3227"
  dark-border-strong: "#7d6e59"
  dark-text: "#f5eee2"
  dark-text-muted: "#c2b49e"
  dark-text-faint: "#978973"
  dark-text-inverse: "#17130e"
  dark-primary: "#f2a93e"
  dark-primary-hover: "#f6bb62"
  dark-primary-active: "#f9cc86"
  dark-primary-text: "#1c1206"
  dark-primary-soft: "#3b2b14"
  dark-accent: "#dc8fbb"
  dark-success: "#6fc487"
  dark-warning: "#e3c44e"
  dark-danger: "#f28b7c"
  dark-focus: "#f2a93e"
  dark-scrim: "rgba(8, 6, 3, 0.66)"
  dark-shadow: "rgba(0, 0, 0, 0.5)"
spacing:
  "1": 4px
  "2": 8px
  "3": 12px
  "4": 16px
  "6": 24px
  "8": 32px
  "12": 48px
  "16": 64px
rounded:
  sm: 2px
  md: 4px
  lg: 6px
  full: 9999px
typography:
  display:
    fontFamily: Outfit
    fontSize: 44px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.03em
  title:
    fontFamily: Outfit
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.02em
  heading:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  body:
    fontFamily: Manrope
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0em
  small:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0em
  caption:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: 0.02em
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    borderColor: "{colors.border-strong}"
    rounded: "{rounded.md}"
  button-ghost:
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text}"
    borderColor: "{colors.border-strong}"
    rounded: "{rounded.md}"
  select:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text}"
    borderColor: "{colors.border-strong}"
    rounded: "{rounded.md}"
  checkbox:
    backgroundColor: "{colors.primary}"
    borderColor: "{colors.border-strong}"
    rounded: "{rounded.sm}"
  switch:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.full}"
  card:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    borderColor: "{colors.border}"
    rounded: "{rounded.lg}"
  table:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    borderColor: "{colors.border}"
    rounded: "{rounded.lg}"
  tabs:
    textColor: "{colors.text}"
    borderColor: "{colors.border}"
    rounded: "{rounded.md}"
  dialog:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
  toast:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    borderColor: "{colors.border}"
    rounded: "{rounded.md}"
  empty-state:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.lg}"
  nav:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    borderColor: "{colors.border}"
---
## Overview

- Ledgerline is bookkeeping for small shops: invoices out, payments in, and what is still owed, on one dense, warm screen an owner reads at the counter after closing (BRAND.html chapter 01).
- The three feel words are warm, dense and confident; when they pull apart, confident wins and a figure is stated plainly (BRAND.html chapter 01).
- The figure leads: every screen opens on the number that matters, what came in and what is still out, with menus and labels small beside it (BRAND.html chapter 01).
- Rows over summaries: a list is a table with every amount in view, never a figure hidden behind a click (BRAND.html chapter 01).
- Exact or not at all: amounts are shown to the cent, never rounded or estimated without saying so on the same line (BRAND.html chapter 01).
- The mark is a placeholder rounded square in `{colors.primary}`, left of the wordmark at a third of its width; under 32 px it stands alone, and it never sits on a photo, a scanned receipt or a pattern (BRAND.html chapter 02).

## Colors

- `{colors.primary}` is the one amber: the action that moves money (New invoice, Send invoice, Record payment) and the current place in the app. Never a total, never a heading, never decoration (BRAND.html chapter 03).
- `{colors.accent}` is plum and has one job: marking what changed since the owner last looked, a payment that landed overnight or a figure that moved. Never a button, never a status (BRAND.html chapter 03).
- Cream and warm browns (`{colors.canvas}`, `{colors.surface}`, `{colors.surface-raised}`) carry the page so the amounts read before the chrome (BRAND.html chapter 03).
- Paid is `{colors.success}`, due is `{colors.warning}`, overdue and void are `{colors.danger}`, always as a dot and a word, never color alone (BRAND.html chapter 07).
- In dark mode text sits on `{colors.dark-canvas}`, a warm brown-black, never pure black; the primary becomes the brighter `{colors.dark-primary}` with `{colors.dark-primary-text}` on it (BRAND.html chapter 03).

## Typography

- `{typography.display}` and `{typography.title}` are for screen titles, the week's total and empty states; nothing in the display face goes below `{typography.heading}` (BRAND.html chapter 04).
- `{typography.body}` and `{typography.small}` carry tables, forms, labels and every amount, always with tabular figures so columns line up (BRAND.html chapter 04).
- The mono face is for invoice numbers and reference codes only; amounts never use it (BRAND.html chapter 04).
- Every amount carries two decimals, the currency sign sits right against the number, and lines stay under seventy characters (BRAND.html chapter 04).

## Layout

- Space steps in fours: `{spacing.1}` to `{spacing.3}` inside a control, `{spacing.2}` to `{spacing.4}` between rows and fields, `{spacing.6}` and `{spacing.8}` between groups, and nothing above `{spacing.12}` inside the app (BRAND.html chapter 05).
- Screens are dense: a full table of invoices or a whole invoice fits on a laptop screen without scrolling (BRAND.html chapter 05).

## Elevation & Depth

- A shadow means something floats over the ledger: `--shadow-sm` for switch thumbs and the sticky table head, `--shadow-md` for menus, toasts and a hovered invoice card, `--shadow-lg` for the void dialog only (BRAND.html chapter 05).
- Tables, cards and the invoice sheet sit flat on a `--border-width` hairline in `{colors.border}` (BRAND.html chapter 05).
- `--border-width-strong` means focus, selection or the total at the foot of an invoice, and nothing else (BRAND.html chapter 05).

## Shapes

- Corners are tight, like a printed form: `{rounded.sm}` for checkboxes, `{rounded.md}` for buttons, fields and table frames, `{rounded.lg}` for cards and dialogs (BRAND.html chapter 05).
- `{rounded.full}` is only for switches, avatars and status badges (BRAND.html chapter 05).

## Components

- `{components.button-primary}` appears once per screen, labelled with a verb and its object: Send invoice, Record payment (BRAND.html chapter 07).
- `{components.button-ghost}` is the quiet way out, Not now or Back, and always sits beside a primary or a secondary (BRAND.html chapter 07).
- `{components.input}` always has a visible label; amounts in a field align right, and an error says what to fix beside an icon (BRAND.html chapter 07).
- `{components.checkbox}` is saved with the invoice; `{components.switch}` acts at once and never sits inside the invoice form (BRAND.html chapter 07).
- `{components.card}` is one invoice in the dashboard's due list: number, customer, amount and lines, then status; it lifts only when it opens (BRAND.html chapter 07).
- `{components.table}` shows invoice numbers in mono, amounts right-aligned, status as a dot and a word, and the current row marked by a bar (BRAND.html chapter 07).
- `{components.tabs}` filter one list (All, Due, Overdue, Paid); the selected tab carries an amber bar, never only a color (BRAND.html chapter 07).
- `{components.dialog}` is only for what cannot be undone, voiding an invoice or removing a customer; the title asks, the buttons answer in words (BRAND.html chapter 07).
- `{components.toast}` says what just happened in one line and leaves after five seconds; an error stays until dismissed (BRAND.html chapter 07).
- `{components.empty-state}` says why the space is empty and offers one next step, with no illustration and no cheer (BRAND.html chapter 07).
- `{components.nav}` holds four places named with nouns, Dashboard, Invoices, Customers, Reports; the current one is filled and the mark leads home (BRAND.html chapter 07).

## Do's and Don'ts

- Do: "Invoice 0142 sent to Quayside Bakery." Don't: "Success. Your invoice has been processed." (BRAND.html chapter 09).
- Do: "$860.00 is still out, across 4 invoices." Don't: "You may have some outstanding receivables." (BRAND.html chapter 09).
- Do: "Invoice not sent. Add an email address for Quayside Bakery." Don't: "Oops, we could not send that one." (BRAND.html chapter 09).
- Do: "Record payment". Don't: "Process transaction" (BRAND.html chapter 09).

## Motion

- Hovers use `--motion-fast`, rows that open in place use `--motion-base`, and toasts or a payment that just landed arrive from just below in `--motion-slow`, all on `--ease` (BRAND.html chapter 08).
- The spinner appears only inside the button that started the wait, Sending or Syncing, and only after half a second (BRAND.html chapter 08).
- Numbers never count up, charts never grow on load, and every animation stops with reduced motion (BRAND.html chapter 08).

## Voice

- Ledgerline speaks like a good bookkeeper: plain, sure and brief (BRAND.html chapter 09).
- Lead with the figure and the name, say what is owed and what to do next, without blame (BRAND.html chapter 09).
- Use shop words, owed and paid, never accounts receivable or ledger jargon; never "Oops", never an exclamation mark (BRAND.html chapter 09).

## Responsive

- Below 640 the invoices table becomes a list with number and amount on top, and the menu folds into a bar of four places (BRAND.html chapter 10).
- From 900 the side menu stays open and the dashboard shows the week's four figures in one row (BRAND.html chapter 10).
- From 1200 the invoices table shows every column, due date and terms included (BRAND.html chapter 10).
- Every target is at least 24 by 24 px and 44 on touch screens, focus is always visible, and contrast meets 4.5:1 for text and 3:1 for icons in both themes (BRAND.html chapter 10).

## Decisions

### Amber and cream, not navy and grey

- Decision: the palette is warm, with the amber `{colors.primary}` on cream.
- Reason: a cool navy and grey palette read as a bank or an audit, and these owners want their books to feel like their own shop.
- Rejected: a cool navy and grey palette.

### A geometric sans with tight corners, not a rounded friendly one

- Decision: the display face is a bold geometric sans and the radii stay at `{rounded.sm}`, `{rounded.md}` and `{rounded.lg}`.
- Reason: a rounded, friendly sans with big radii felt like a toy, and a figure on an invoice has to look final.
- Rejected: a rounded, friendly sans with big radii.
