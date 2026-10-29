# quarry brand

**Mark:** a faceted hexagon, raw data cut into value. The gold facet is the insight.
**Wordmark:** "quarry" in Poppins SemiBold, tracking −2, converted to outlines (no font needed). Poppins is under the SIL Open Font License (`POPPINS-OFL.txt`).

| Colour                   | Hex       |
| ------------------------ | --------- |
| Teal (primary)           | `#0F6E56` |
| Teal light facet         | `#1D9E75` |
| Teal dark facet          | `#085041` |
| Gold (accent)            | `#EF9F27` |
| Ink (wordmark on light)  | `#2C2C2A` |
| Paper (wordmark on dark) | `#F1EFE8` |

See `preview.png` for every asset.

## Logo only (no text)

- `svg/quarry-mark.svg`: colour
- `svg/quarry-mark-white.svg`: for dark or teal backgrounds
- `svg/quarry-mark-greyscale.svg`: one-colour uses
- `png/quarry-mark-{64,128,256,512,1024}.png`, `png/quarry-mark-white-512.png`, `png/quarry-mark-greyscale-512.png`

## Logo with text

- `svg/quarry-logo-light.svg`, `svg/quarry-logo-dark.svg` (+ 1200px PNGs)
- `svg/quarry-wordmark.svg`, `svg/quarry-wordmark-white.svg`: text only

## App icons

- `svg/quarry-app-icon.svg`, `svg/quarry-app-icon-dark.svg` (+ 1024px PNGs)

## Frontend drop-ins (`frontend/`)

- `public/`: `favicon.ico` (16/32/48), `favicon.svg`, `appicon.png`, `icon-192.png`, `icon-512.png`, `site.webmanifest`, Teams `color.png` + `outline.png`, empty-state backgrounds `lightLogo.svg`, `darkLogo.svg`, `light-card-logo.svg`, `dark-card-logo.svg`
- `src/components/icons/`: `quarry-logo.svg`, `quarry-full-logo.svg`, `quarry-logo-greyscale.svg`, `quarry-desktop-logo.png`

## Regenerate

`node brand/build.mjs brand` rebuilds everything from `wordmark.json` (the outlined Poppins glyphs). It needs `@resvg/resvg-js`, currently resolved from `../fork-reference/apps/backend`.
