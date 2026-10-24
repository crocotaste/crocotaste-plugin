---
version: alpha
name: Tidewell
colors:
  canvas: "#f6f9fb"
  surface: "#ecf2f6"
  surface-raised: "#ffffff"
  border: "#d5e0e7"
  border-strong: "#7d909d"
  text: "#0e2231"
  text-muted: "#475b69"
  text-faint: "#697d8b"
  text-inverse: "#ffffff"
  primary: "#13507e"
  primary-hover: "#0f4268"
  primary-active: "#0b3453"
  primary-text: "#ffffff"
  primary-soft: "#dce9f3"
  accent: "#1d6f66"
  success: "#1d744c"
  warning: "#985500"
  danger: "#b42f48"
  focus: "#13507e"
  scrim: "rgba(14, 34, 49, 0.44)"
  shadow: "rgba(14, 34, 49, 0.08)"
  dark-canvas: "#0b1620"
  dark-surface: "#112029"
  dark-surface-raised: "#172a35"
  dark-border: "#22384a"
  dark-border-strong: "#5e7788"
  dark-text: "#e6eff4"
  dark-text-muted: "#a3b6c3"
  dark-text-faint: "#7b919f"
  dark-text-inverse: "#0b1620"
  dark-primary: "#86b9e2"
  dark-primary-hover: "#a1c9ea"
  dark-primary-active: "#bcd8f0"
  dark-primary-text: "#0a1d2c"
  dark-primary-soft: "#173149"
  dark-accent: "#6fc4b7"
  dark-success: "#62c497"
  dark-warning: "#e2a653"
  dark-danger: "#f08598"
  dark-focus: "#86b9e2"
  dark-scrim: "rgba(2, 8, 13, 0.62)"
  dark-shadow: "rgba(0, 0, 0, 0.42)"
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
  sm: 8px
  md: 14px
  lg: 24px
  full: 9999px
typography:
  display:
    fontFamily: Newsreader
    fontSize: 60px
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: -0.02em
  title:
    fontFamily: Newsreader
    fontSize: 38px
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.01em
  heading:
    fontFamily: Newsreader
    fontSize: 23px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0em
  body:
    fontFamily: Figtree
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0em
  small:
    fontFamily: Figtree
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
  caption:
    fontFamily: Figtree
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
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

- Tidewell tells sea swimmers when the water at their spot is good, and why, in one reading of tide, wind and water temperature (BRAND.html chapter 01).
- The three feel words are cool, airy and unhurried; when they collide, unhurried wins and nothing rushes a swimmer into the water (BRAND.html chapter 01).
- The sea comes first: the swim window and the tide take the top of every screen, and settings and history wait below (BRAND.html chapter 01).
- Readable at arm's length: between one more fact and a bigger number, the number wins (BRAND.html chapter 01).
- Every verdict comes with its reason, such as rising tide, wind offshore or the water temperature (BRAND.html chapter 01).
- The mark is a placeholder squircle set left of the wordmark; below 32 px it stands alone, on `{colors.primary}` it turns `{colors.primary-text}`, and it never sits on a photo or a wave pattern (BRAND.html chapter 02).

## Colors

- `{colors.primary}` marks the one thing to do on a screen, Log a swim or Save spot, and the current place in the app. Never a heading, never decoration (BRAND.html chapter 03).
- `{colors.accent}` marks the good swim window, the hours when tide and wind line up, and nothing else: never a button, never a status (BRAND.html chapter 03).
- Blue-tinted neutrals, `{colors.canvas}`, `{colors.surface}` and `{colors.surface-raised}`, carry the page so the reading stands out (BRAND.html chapter 03).
- `{colors.success}`, `{colors.warning}` and `{colors.danger}` give the swim verdict in the tide table, always beside a word; danger is kept for a sea that is really unsafe (BRAND.html chapter 07).
- In dark mode the page is a night sea on `{colors.dark-canvas}`, never pure black, and the primary becomes the softer `{colors.dark-primary}` (BRAND.html chapter 03).

## Typography

- Newsreader, through `{typography.display}`, `{typography.title}` and `{typography.heading}`, sets the swim verdict, the high tide time and screen titles; never below the heading size, never bold (BRAND.html chapter 04).
- Figtree, through `{typography.body}`, `{typography.small}` and `{typography.caption}`, sets labels, reasons, settings and messages (BRAND.html chapter 04).
- Spline Sans Mono sets every tide time, height and water temperature, so numbers line up from one hour to the next (BRAND.html chapter 04).
- Lines stay under sixty-five characters and a reason never runs past three lines (BRAND.html chapter 04).

## Layout

- Inside a control use `{spacing.1}` to `{spacing.3}`, between controls `{spacing.4}` and `{spacing.6}`, between the reading and everything else `{spacing.8}` and up; never a value off the scale (BRAND.html chapter 05).
- A screen holds one reading with room on every side, like open water, not a dashboard (BRAND.html chapter 05).

## Elevation & Depth

- A shadow means something floats above the forecast: `--shadow-sm` for the dawn alert switch thumb, `--shadow-md` for toasts and a lifted spot card, `--shadow-lg` for dialogs and bottom sheets (BRAND.html chapter 05).
- Cards rest flat on a `--border-width` hairline in `{colors.border}` until a finger or a pointer lifts them; `--border-width-strong` means focus or the selected day and nothing else (BRAND.html chapter 05).

## Shapes

- `{rounded.sm}` for checkboxes and badges, `{rounded.md}` for buttons and fields, `{rounded.lg}` for the swim window card, sheets and dialogs, `{rounded.full}` for switches and the avatar only (BRAND.html chapter 05).
- Corners stay generous everywhere; nothing in Tidewell is sharp (BRAND.html chapter 05).

## Components

- `{components.button-primary}`: one per screen, a verb and its object, Log a swim, never Go (BRAND.html chapter 07).
- `{components.button-ghost}`: the quiet way out, Not now, Skip, Close, always beside another button (BRAND.html chapter 07).
- `{components.input}`: a visible label above, never a placeholder alone; the error says what to do next beside an icon (BRAND.html chapter 07).
- `{components.select}`: for a short known list such as units, the alert time or the home spot; two or three options read better as tabs (BRAND.html chapter 07).
- `{components.switch}` acts at once, like the dawn alert, and never sits in a form with a save button; `{components.checkbox}` is saved with its form (BRAND.html chapter 07).
- `{components.card}`: one spot per card, the window first, then the spot, the reason and a one-word verdict badge (BRAND.html chapter 07).
- `{components.table}`: a day of tides, times and heights in mono, the verdict as a dot and a word, the next tide marked by a bar (BRAND.html chapter 07).
- `{components.dialog}`: only for what cannot be undone, like deleting the swim log; the buttons answer in words (BRAND.html chapter 07).
- `{components.toast}`: one line, gone after six seconds; a failed update stays until dismissed (BRAND.html chapter 07).
- `{components.nav}`: four places, Today, Week, Spots, Settings; the mark leads to Today (BRAND.html chapter 07).

## Do's and Don'ts

- Do: "Good to swim from 06:10 to 07:50." Don't: "Epic conditions this morning, don't miss out." (BRAND.html chapter 09)
- Do: "Wind turning onshore after 09:00. Swim early or wait for tomorrow." Don't: "Hurry, the window is closing." (BRAND.html chapter 09)
- Do: "Forecast not updated. Check your signal and pull down to refresh." Don't: "Error 503: upstream data unavailable." (BRAND.html chapter 09)
- Do: "Log a swim". Don't: "Go". (BRAND.html chapter 09)

## Motion

- A logged swim or a toast drifts up in `--motion-slow`, an hour in the tide table opens in `--motion-base`, hovers take `--motion-fast`, all on `--ease` (BRAND.html chapter 08).
- The spinner shows only inside the button that started the wait, after half a second; the tide curve never animates (BRAND.html chapter 08).
- Every animation stops and every transition is instant with reduced motion (BRAND.html chapter 08).

## Voice

- Plain, steady and kind, like a calm friend at the top of the steps (BRAND.html chapter 09).
- Give the time, the place and the reason, every time; stay level when the sea turns and say what to do instead (BRAND.html chapter 09).
- Use the words swimmers use on the beach, not the words of a forecast model; never epic, hurry or don't miss out, and no exclamation marks (BRAND.html chapter 09).

## Responsive

- Below 640 px the day is one column, verdict then tide curve then hours, with the tab bar at the bottom (BRAND.html chapter 10).
- From 900 px the tide table sits beside the verdict and the week shows as a strip of seven days (BRAND.html chapter 10).
- From 1200 px the sidebar stays open with the spots and the week opens beside today (BRAND.html chapter 10).
- Every target is at least 24 by 24 px, 44 on touch; focus is always visible; text meets 4.5:1 and icons 3:1 in both themes (BRAND.html chapter 10).

## Decisions

### Sea-glass green, not surf orange, for the accent

- Decision: the accent is the sea-glass green in `{colors.accent}`.
- Reason: these swimmers come for quiet; orange read as sport and adrenaline.
- Rejected: a bright surf orange.

### A serif, not a geometric sans, for display

- Decision: the display face is Newsreader.
- Reason: the serif keeps the morning slow and human.
- Rejected: a geometric sans, which felt like a fitness tracker.
