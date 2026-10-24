# Brand brief: Tidewell

_Approved before the brand book was written._

## Product and people

Tidewell is a tide and weather app for sea swimmers: it shows when the water at your spot is good to swim, and why. People open it most mornings, often before first light, standing at the kitchen window or already at the top of the beach steps, with cold hands and a towel over one arm. They want one answer in a few seconds: go now, go later, or not today.

## Feel

Cool, airy, unhurried. When they collide, unhurried wins: we never rush a swimmer into the water.

- Cool: the colors of a clear morning sea, blue-grey and white, nothing hot or loud.
- Airy: few things on a screen, lots of room around them, the reading big enough to see from arm's length.
- Unhurried: plain sentences, no countdowns, no alarms in red unless the sea is really dangerous.

## References and what was taken

- A printed harbour tide table: we take the plain columns of times and heights and the trust they carry. We leave the cramped type.
- A seaside lido's painted signs: we take the serif lettering and the calm, generous spacing. We leave the nostalgia and the stripes.
- A good weather radio bulletin: we take the order of things (the headline, then the detail) and the even tone. We leave the jargon.

## Color

| Role           | Light     | Dark      |
| -------------- | --------- | --------- |
| Canvas         | `#f6f9fb` | `#0b1620` |
| Surface        | `#ecf2f6` | `#112029` |
| Surface raised | `#ffffff` | `#172a35` |
| Text           | `#0e2231` | `#e6eff4` |
| Text muted     | `#475b69` | `#a3b6c3` |
| Primary        | `#13507e` | `#86b9e2` |
| Accent         | `#1d6f66` | `#6fc4b7` |
| Success        | `#1d744c` | `#62c497` |
| Warning        | `#985500` | `#e2a653` |
| Danger         | `#b42f48` | `#f08598` |

- Primary is the one deep blue: the main action on a screen (Log a swim, Save spot) and the place you are in the app. Never a heading, never decoration.
- Accent is sea-glass green and has one job: the good swim window, the hours when tide and wind line up. Never a button, never a status.
- The dark theme is a night sea, deep blue-black, never pure black. The dark primary is a lighter, softer blue.

## Type

- Display: Newsreader (SIL Open Font License), fallback `Georgia, "Times New Roman", serif`. Weight 400 at display and title size, 500 at heading size, tracking -0.02em at display size.
- Body: Figtree (SIL Open Font License), fallback `ui-sans-serif, system-ui, sans-serif`.
- Mono: Spline Sans Mono (SIL Open Font License), fallback `ui-monospace, Menlo, monospace`. For tide times, heights and temperatures, so they line up.
- Base size 17 px, line height 1.6.

## Shape and density

- Radii: small 8 px, medium 14 px, large 24 px, and full for switches and avatars.
- Border 1 px hairline; 2 px only for focus and selection.
- Roomy: the 4 px space scale, with 24 px or more between groups. A screen holds one reading and three or four supporting facts, never a dashboard.

## Motion

- Slow and soft: 160 ms for hovers, 260 ms for things that open, 420 ms for things that arrive. Easing `cubic-bezier(0.3, 0, 0.2, 1)`.
- The tide curve never animates on load; numbers never count up. Everything stops with reduced motion.

## Voice

- Plain, steady, kind.
- "High tide at 05:42. The water is good from 06:10 to 07:50."
- "Wind turning onshore after 09:00. Swim early or wait for tomorrow."
- Never: "epic", "perfect conditions", "don't miss out", "hurry", "stoked", exclamation marks.

## Rejected, with reasons

- A bright surf orange as the accent: it read as sport and adrenaline, and these swimmers come for quiet.
- A geometric sans for the display face: it felt like a fitness tracker; the serif keeps the morning slow and human.
