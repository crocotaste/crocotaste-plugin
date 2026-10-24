# What to read

Read in this order. Skip a step when the search finds nothing, and say so in `## Found in the code`. Exclude `node_modules`, build output (`.next`, `dist`, `build`, `out`) and lock files from every search. Note each value with its path.

## 1. Existing design documents

- Find: `DESIGN.md`, `BRAND.html`, `docs/design/`, a `design-tokens.json` or `tokens.json`, a Style Dictionary or Figma tokens export.
- Take: every stated value, as a claim to check against the code in the steps below.

## 2. Tailwind

- Find: `tailwind.config.*` (v3 and earlier) and any CSS file with `@theme` (v4): `grep -rln "@theme" --include="*.css" .`
- Take: `theme.colors` and `theme.extend.colors`, `fontFamily`, `borderRadius`, `spacing`, `fontSize`, `boxShadow`, the `darkMode` setting; in v4, every `--color-*`, `--font-*`, `--radius-*`, `--spacing-*`, `--text-*` inside `@theme`.
- Note: a Tailwind config that only extends the defaults means the brand is mostly Tailwind's palette. Say which default colors are used.

## 3. CSS custom properties

- Find: the global stylesheet (`globals.css`, `app.css`, `index.css`, `styles/*.css`, `src/styles/*`), then every `:root`, `.dark`, `[data-theme]` and `@media (prefers-color-scheme: dark)` block: `grep -rn -- "--[a-z].*:" --include="*.css" --include="*.scss" .`
- Take: each variable and its value in light and in dark. Map each to a role (canvas, surface, text, primary, accent, border, success, warning, danger). Note roles that exist in light but not in dark.

## 4. Theme files

- Find: `theme.ts`, `theme.js`, `tokens.ts`, `colors.ts`, `createTheme(` (MUI), `extendTheme(` (Chakra), `createStitches(`, `defineConfig(` (Panda), styled-components `ThemeProvider` values, `vanilla-extract` `createTheme`.
- Take: palette, typography, radii, spacing, shadows, transitions.

## 5. Fonts

- Find: `next/font` imports (`grep -rn "next/font" .`), `@font-face` rules, `<link>` tags to font hosts in layouts and `index.html`, `@fontsource` packages in `package.json`, font files under `public/` or `assets/`.
- Take: each family, the weights loaded, how it is loaded, and the fallback stack. Note a licensed face (no open source package, a commercial foundry) so the brief can name an open fallback.

## 6. The component library

- Find: in `package.json`, a UI library (`@radix-ui/*`, shadcn/ui via `components.json`, `@mui/material`, `@chakra-ui/react`, `@mantine/core`, `antd`, `bootstrap`, `daisyui`, `vuetify`, `@headlessui/*`, `bits-ui`, `@skeletonlabs/*`); the local components folder (`components/`, `src/components/`, `components/ui/`, `src/lib/components/`).
- Take: which library the look starts from and whether it is retuned (custom tokens) or used with its defaults.

## 7. The most used components

Count imports of each local component and name the top ten. From the repo root:

```bash
grep -rhoE "from ['\"][^'\"]*components/[^'\"]+['\"]" \
  --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" \
  --include="*.vue" --include="*.svelte" --include="*.astro" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist --exclude-dir=build . \
  | sed -E "s/.*components\/([^'\"]+)['\"]/\1/" | sort | uniq -c | sort -rn | head -10
```

Adjust the pattern to the project's alias (`@/components/`, `$lib/components/`, `~/components/`). If the project imports from a single barrel file, count the named imports instead.

Then open each of the ten and read:

- which tokens or classes it uses for color, radius, spacing and type;
- every hard-coded value (a hex, a px size, an `rgb(`, a Tailwind arbitrary value like `bg-[#3b82f6]`);
- its variants (primary, secondary, ghost, destructive) and states (hover, focus, disabled).

## 8. Hard-coded values across the code

- Find: hex colors outside the token files: `grep -rnoE "#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b" --include="*.tsx" --include="*.jsx" --include="*.vue" --include="*.svelte" --include="*.css" --exclude-dir=node_modules .`; Tailwind arbitrary values: `grep -rnoE "\[(#|[0-9]+px)[^]]*\]" --include="*.tsx" --include="*.jsx" --exclude-dir=node_modules .`
- Take: each value that duplicates or competes with a token, with how many files use it. These feed `## Inconsistencies`.

## 9. Logo and icons

- Find: `logo*`, `icon*`, `favicon*`, `apple-touch-icon*`, `og-image*` and any `.svg` in `public/`, `static/` or `assets/`; the icon library in `package.json` (`lucide-react`, `@phosphor-icons/*`, `@heroicons/*`, `react-icons`).
- Take: the paths of the logo files and the icon library in use. Never copy or modify a logo file.

## 10. Voice

- Find: the home page, the empty states, the error messages, button labels in the top components.
- Take: two or three lines quoted as written, and the patterns (sentence case or title case, "you" or "we", punctuation habits).
