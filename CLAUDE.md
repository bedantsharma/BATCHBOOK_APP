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

**First hypothesis (WRONG, don't repeat it):** assumed this was a `SOFT_INPUT_ADJUST_RESIZE`
vs. edge-to-edge race inside `KeyboardAvoidingView`'s height math, and "fixed" it by
swapping to `react-native-keyboard-controller`. That change was verified (native module
confirmed present in the built APK, JS wired up correctly) but made **zero** visible
difference on-device — proof the diagnosis was incomplete.

**Actual root cause (confirmed via live `adb logcat` while reproducing on a real device):**
RN's `<Modal>` on Android renders into a *second native Dialog window*, separate from the
Activity's window (`ReactModalHostView.kt` creates a fresh `ComponentDialog` and calls
`WindowManager.addView`). The logcat capture showed that window being **destroyed and a
brand-new one created** (`Add to mViews` → `window dying`/`EXITING` → new `Add to mViews`)
*during* the interaction — once right as the keyboard first engaged, and again right as it
was dismissed — not a resize, a full native-surface teardown and rebuild. That is what reads
as "pushed off screen" (the whole surface momentarily gone) and "flickers like crazy"
(destroy + recreate, twice). Swapping which `KeyboardAvoidingView` implementation sits
inside the Modal can't fix this: the keyboard-avoidance code has nothing to attach to once
the window it was attached to gets torn down mid-session. Expo Go doesn't hit this because
Modal show/hide state doesn't force the same dialog-recreation path there.

**Fix (already in place):** removed RN's `<Modal>` from `src/components/BottomSheetModal.tsx`
entirely. It's now a plain conditionally-rendered, absolutely-positioned overlay `View`
inside the screen's own tree (same Activity window, no second native window to tear down),
using `KeyboardAvoidingView` from `react-native-keyboard-controller` for the actual
avoidance behavior, plus a manual `BackHandler` listener to preserve "back button closes
the sheet" (previously provided by `Modal`'s `onRequestClose`).

**Rules for future keyboard/modal work:**
- Don't reach for RN's `<Modal>` for anything that contains a text input in this app —
  it can be silently torn down and recreated by the OS/RN mid-interaction, wiping out
  whatever keyboard-avoidance is attached to it. Use the in-tree overlay pattern in
  `BottomSheetModal.tsx` instead (shared by batches, students, fees, attendance, and tests
  screens). `src/components/DateTimeField.tsx` still uses a real `<Modal>` for its
  date/time picker — that's fine since it has no text input, but if it ever grows one,
  convert it too.
- If a keyboard/modal bug survives a fix, don't trust the fix from source-reading alone —
  pull real `adb logcat` while reproducing on-device (`adb logcat -c`, reproduce, dump/kill
  the capture, grep for `Add to mViews` / `window dying` / `EXITING` / `hide(ime` /
  `show(ime`). That's what caught this.
- Don't test this class of bug in Expo Go and call it done — it only reproduces in a
  real EAS/standalone build on a device. Verify keyboard behavior in modals on an actual
  build before shipping.
