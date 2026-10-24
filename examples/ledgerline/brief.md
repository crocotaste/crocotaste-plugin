# Brand brief: Ledgerline

_Approved before the brand book was written._

## Product and people

Ledgerline is bookkeeping for small shops: invoices out, payments in, and a clear answer to "who still owes us". It is used by the owner of a hardware store, a bakery or a print shop, usually at the counter after closing or on a Sunday evening with the week's receipts in a pile. They open it every day for a minute to see what came in, and once or twice a week for half an hour to send invoices and chase late ones.

## Feel

Warm, dense, confident. When they collide, confident wins: a figure is stated plainly and never hedged.

- Warm: the colors of a shop at closing time, cream paper, amber light, brown ink. Nothing cold or clinical.
- Dense: a full week of money on one screen, tight rows, small radii, no empty hero areas. Owners came to read numbers, not to scroll.
- Confident: amounts in heavy, even figures that line up, short statements, one clear next step.

## References and what was taken

- A carbon-copy invoice pad: we take the numbered rows, the ruled columns and the feeling that every line is a record. We leave the cramped handwriting and the smudges.
- An old enamel shop sign: we take the bold geometric lettering and the warm, saturated color. We leave the ornament and the nostalgia.
- A good accountant's year-end letter: we take the order (the total first, then what makes it up) and the plain, sure tone. We leave the legal phrasing.

## Color

| Role           | Light     | Dark      |
| -------------- | --------- | --------- |
| Canvas         | `#fbf7ef` | `#17130e` |
| Surface        | `#f4ecde` | `#201a13` |
| Surface raised | `#fffdf9` | `#2a231a` |
| Text           | `#22190f` | `#f5eee2` |
| Text muted     | `#5c4f3d` | `#c2b49e` |
| Primary        | `#9c5800` | `#f2a93e` |
| Accent         | `#8a2f62` | `#dc8fbb` |
| Success        | `#2c7a3f` | `#6fc487` |
| Warning        | `#856500` | `#e3c44e` |
| Danger         | `#b42a22` | `#f28b7c` |

- Primary is the one amber: the main action on a screen (New invoice, Send invoice, Record payment) and the place you are in the app. Never a heading, never a total, never decoration.
- Accent is plum and has one job: it marks what changed since you last looked, a payment that landed overnight or a figure that moved. Never a button, never a status.
- The dark theme is a back office after closing, a warm brown-black, never pure black. The dark primary is a brighter amber with dark text on it.
- Warning is an ochre yellow, kept apart from the amber primary by hue, and always paired with a word.

## Type

- Display: Outfit (SIL Open Font License), fallback `ui-sans-serif, system-ui, sans-serif`. A geometric sans, weight 700 at display and title size, 600 at heading size, tracking -0.03em at display size.
- Body: Manrope (SIL Open Font License), fallback `ui-sans-serif, system-ui, sans-serif`. Every amount uses its tabular figures so columns line up.
- Mono: Space Mono (SIL Open Font License), fallback `ui-monospace, Menlo, monospace`. Only for invoice numbers and reference codes, never for amounts.
- Base size 15 px, line height 1.45.

## Shape and density

- Radii: small 2 px, medium 4 px, large 6 px, and full only for switches, avatars and status badges.
- Border 1 px hairline; 2 px only for focus, selection and the total line on an invoice.
- Dense: the 4 px space scale, 8 to 12 px inside a group, 24 px between groups. A screen holds a full table of thirty rows or a whole invoice without scrolling on a laptop.

## Motion

- Quick and plain: 90 ms for hovers, 150 ms for things that open, 240 ms for things that arrive. Easing `cubic-bezier(0.25, 0, 0, 1)`.
- Numbers never count up and charts never grow on load. Everything stops with reduced motion.

## Voice

- Plain, sure, brief.
- "Invoice 0142 to Quayside Bakery is 6 days overdue. Send a reminder?"
- "$1,240.00 came in this week. $860.00 is still out."
- Never: "Oops", "awesome", "crushing it", "financial wellness", "just", exclamation marks, a figure rounded without saying so.

## Rejected, with reasons

- A cool navy and grey palette: it read as a bank or an audit, and these owners want their books to feel like their own shop.
- A rounded, friendly sans with big radii: it felt like a toy, and a figure on an invoice has to look final.
