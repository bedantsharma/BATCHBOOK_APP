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

## Keyboard handling inside `<Modal>` only breaks in standalone/EAS builds, not Expo Go

**Symptom:** open a form inside a bottom-sheet-style `<Modal>` (e.g. "create batch"),
focus a text input — the keyboard pushes the form off-screen, and closing the keyboard
causes a violent flicker/stutter instead of a smooth resize. Works fine in Expo Go;
only reproduces in a real device build (EAS/standalone APK).

**Why:** RN's `<Modal>` on Android renders into a *second native Dialog window*,
separate from the Activity's window. This project's RN/Expo version forces that Dialog
window into edge-to-edge mode (`ReactModalHostView`'s `statusBarTranslucent` /
`navigationBarTranslucent` getters return `true` whenever the app's edge-to-edge feature
flag is on, which it is by default), while also hardcoding
`SOFT_INPUT_ADJUST_RESIZE` on that same window. Edge-to-edge + `adjustResize` don't
compose: the OS-driven window resize and RN's stock `KeyboardAvoidingView` (which
computes its own height/padding via `Dimensions` diffing) race each other — hence
push-off-screen on open, flicker on close. Expo Go doesn't hit this because it runs a
different bundled RN runtime for the Modal codepath, so the bug is invisible until a
real standalone build.

**Fix (already in place):** installed `react-native-keyboard-controller`, wrapped the
app root (`src/app/_layout.tsx`) in `<KeyboardProvider>`, and swapped the `KeyboardAvoidingView`
import in `src/components/BottomSheetModal.tsx` to come from
`react-native-keyboard-controller` instead of `react-native`. That library specifically
detects RN `<Modal>`s (`ModalAttachedWatcher.kt`), attaches its own
`WindowInsetsAnimationCallback` directly to the Modal's Dialog window, and sets
`SOFT_INPUT_ADJUST_NOTHING` on it — sidestepping the OS resize race entirely and driving
avoidance from real native inset-animation values instead.

**Rules for future keyboard/modal work:**
- Any new modal/bottom-sheet with text inputs must use `KeyboardAvoidingView` from
  `react-native-keyboard-controller`, not the one built into `react-native`. This
  matters for **every** `<Modal>` in the app (`BottomSheetModal.tsx` is shared by
  batches, students, fees, attendance, and tests screens), not just batch creation.
- Don't test this class of bug in Expo Go and call it done — it only reproduces in a
  real EAS/standalone build on a device. Verify keyboard behavior in modals on an actual
  build before shipping.
