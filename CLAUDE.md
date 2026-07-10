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

##  Research-Backed Principles (reference)

*Sources: Nielsen Norman Group (NN/g), Apple Human Interface Guidelines (HIG), Material Design 3,
Laws of UX, WCAG 2.1.*

### Nielsen's 10 Usability Heuristics
1. **Visibility of system status** — timely feedback for every action.
2. **Match the real world** — user's language ("Mark attendance", "Pending fees"), not jargon.
3. **User control & freedom** — clear undo/cancel; an "emergency exit" from mistakes.
4. **Consistency & standards** — same word/action/placement means the same thing everywhere.
5. **Error prevention** — disable invalid actions, confirm irreversible ones, use pickers not free text.
6. **Recognition over recall** — show selectable options (chips, pickers) instead of remembered input.
7. **Flexibility & efficiency** — accelerators for power users ("Mark all present", swipe actions).
8. **Aesthetic & minimalist design** — every element competes for attention; show only what matters.
9. **Help users recover from errors** — plain-language cause + recovery action ("Retry"), preserve input.
10. **Help & documentation** — contextual, just-in-time hints over buried manuals.

### Mobile-specific
- **Touch targets:** ≥44×44pt (Apple HIG) / 48×48dp (Material), ≥8dp apart. Icon can be 24px with
  invisible padded hit area.
- **Thumb zones:** primary nav + CTA bottom-anchored; rare/destructive actions top corners.
- **Navigation:** bottom tab bar for 3–5 destinations with a clear active state; avoid hamburger
  menus for primary nav.
- **Jakob's Law:** match platform conventions (edge-swipe back, swipe-to-dismiss sheets, system share).

### Visual hierarchy, spacing & typography
- **8pt spacing grid** (4/8/16/24/32) — strongest polish signal.
- **Small typographic scale** (display/title/body/caption), 1–2 font families, line-height ~1.4–1.5.
- **Semantic color roles** — Paid=green, Pending=amber, Overdue=red, used consistently; never rely on
  color alone (pair with label/icon).

### Feedback & system status
- **Skeletons** for content loads (lists/dashboards), **spinners** for short blocking actions (save/pay).
- **Empty states** explain what goes here + offer the first action.
- **Error states** state cause + recovery, preserve input.
- **Optimistic updates** reflect the action instantly, roll back on failure.
- **Micro-interactions** — subtle motion/haptics confirm actions and raise perceived quality.

### Cognitive load (Laws of UX)
- **Progressive disclosure**, **recognition over recall**, **chunking (Miller's ~7±2)**,
  **Hick's Law** (fewer choices = faster decisions), **Fitts's Law** (frequent targets large & near).

### Accessibility (WCAG 2.1 AA)
- Contrast **4.5:1** normal text, **3:1** large text / UI components.
- Respect **Dynamic Type**; layouts reflow without clipping.
- **Screen-reader labels** on every interactive/iconic control; decorative images hidden.
- **Visible affordances** for gestures; no critical action gesture-only.

### Amateur vs. Polished — observable signals
| Signal | Amateur | Polished |
|---|---|---|
| Spacing | Arbitrary gaps | Strict 8pt scale |
| Typography | Many random sizes/weights | Small intentional scale |
| Color | Ad-hoc hex, low contrast | Semantic palette, accessible |
| Motion | Instant cuts / janky | Subtle 150–300ms transitions |
| States | Blank screens, raw spinners | Skeletons, designed empty/error states |
| Components | Stock/misaligned | Consistent, grid-aligned |
| Touch targets | Tiny, crowded | ≥44–48pt, spaced |

---
