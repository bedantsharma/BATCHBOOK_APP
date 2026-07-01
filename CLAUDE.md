@AGENTS.md

# Project gotchas

## Text rendering: `lineHeight` must scale with the OS font size

**Symptom:** text gets visually clipped top-and-bottom (looks "cut in half") on a
device whose OS font size is bumped up — most visibly on tight components like the
batch filter chips, but it can hit any text.

**Why:** the typography scale (`src/constants/typography.ts`) pairs each variant with a
*fixed* `lineHeight`. React Native scales `fontSize` by the OS accessibility font
setting (`allowFontScaling` defaults to true) but does **not** scale a fixed
`lineHeight`. So enlarged glyphs overflow their unscaled line box and get clipped. Chip
padding / container height can't fix this — the clip happens *inside* the `<Text>`.

**Fix (already in place):** `src/components/AppText.tsx` multiplies the line height
(preset or one passed via `style`) by `PixelRatio.getFontScale()`, so the line box grows
with the text. No-op at font scale 1.

**Rules for future text work:**
- Render text through `AppText` (it applies the variant scale + the font-scale-aware
  line height + the correct DMSans face for the weight). Don't drop down to a raw
  `<Text>` with a hardcoded `lineHeight`, and don't set `allowFontScaling={false}` to
  "fix" clipping — that breaks accessibility.
- When sizing a pill/chip/row around text, use vertical **padding**, not a fixed
  `height`/`maxHeight` — a fixed height re-introduces clipping once the font scales
  (this is what originally broke the filter chips; see `FilterChip` + the owner screens'
  `filterRow`, which now use padding + `flexGrow: 0` instead of `maxHeight`).
