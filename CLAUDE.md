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

## `BottomSheetModal` (or any modal) must be rendered at the screen root, never inside a `FlatList` row

**Symptom:** a form opened from a row inside a `FlatList` (e.g. Tests screen → expand a
student → "Add Score") renders tiny and mispositioned — doesn't cover the screen, isn't
anchored to the bottom, looks "cut off from both top and bottom." Trying to scroll/drag
within it does nothing useful, and drags in the surrounding area fall through to the
list underneath and trigger *its* pull-to-refresh instead — which reads as "I can't
scroll the list" even though the list itself is fine.

**Why:** `BottomSheetModal` fills the screen via `position: absolute` +
`StyleSheet.absoluteFill`. In React Native that sizes/positions the element relative to
its **immediate parent**, not the screen. If the modal is instantiated inside a
row component that's rendered by a `FlatList`'s `renderItem` (as the old
`tests.tsx` `StudentCard` did — it owned its own `addScoreVisible` state and rendered
`<AddScoreModal>` as its own last child), the modal's "full screen" is only as big as
that row's own box — confirmed by logging the overlay's `onLayout`: it reported
`{width: 315, height: 193}`, i.e. one collapsed card, not the device screen. No amount
of styling the sheet's own height fixes this; the frame of reference itself is wrong.

**Fix (already in place, `tests.tsx`):** lift the "which row triggered the modal" state
up to the screen component (`TestsScreen`), pass a callback prop down to the row
(`onAddScore(enrollment)` instead of local `useState` + inline `<AddScoreModal>`), and
render a single modal instance at the screen root, as a sibling to the `FlatList` inside
`SafeAreaView` — exactly the pattern `batches.tsx` (`onAddStudent` → `addStudentBatch`
state → one `<AddStudentModal>` at the root), `students.tsx`, `fees.tsx`, and
`attendance.tsx` already used. `tests.tsx` was the only screen that got this wrong.

**Rules for future modal work:**
- A component rendered by `renderItem` (or any list virtualization) must never own
  modal-visibility state or render a modal itself. Bubble the trigger up via a callback
  prop and own the modal + its visibility state in the screen component instead.
- If a "full screen" overlay renders suspiciously small/mispositioned, check what it's
  actually nested inside before touching its styles — log `onLayout` on the overlay
  itself; if the numbers look like a list row instead of a device screen, this is why.

## `BottomSheetModal`'s sheet needs `maxHeight` on the `ScrollView` itself, not a wrapping `View`

**Symptom A — long form cut off:** a form with several fields (e.g. Add Score: name,
subject, date, max marks, obtained marks) opens cut off — the top (title, first
field(s)) is pushed off-screen above the viewport, with no way to scroll up to it.
**Symptom B — sheet renders tiny:** attempting fix A by wrapping the content in a
`ScrollView` inside a `<View style={{maxHeight}}>` instead makes the whole sheet render
tiny and centered, covering neither the top nor the bottom of the screen.

**Why:** the sheet is anchored to the bottom of the overlay (`justifyContent:
'flex-end'`) with no height cap, so (A) it renders at its full natural content height
regardless of screen size — once content is taller than the screen the excess extends
above the top edge, unreachable with no scroll container. Fixing that by giving a
*wrapping* `View` a `maxHeight` and putting an unstyled `ScrollView` inside it causes (B):
a plain `View` auto-sizes to its content, but `ScrollView` does not — its outer frame
needs the `height`/`maxHeight` on its **own** `style` prop or it collapses instead of
growing with content, so the size constraint has to go on the `ScrollView`, not a `View`
wrapping it.

**Fix (already in place):** put `maxHeight` (currently `88%`) directly on the
`ScrollView`'s `style`, and put padding on its `contentContainerStyle` instead
(`keyboardShouldPersistTaps="handled"` so field taps still register while a
picker/keyboard is up). This lets the sheet shrink-wrap short forms (no empty scroll
space) and only engage scrolling once content actually exceeds the cap.

## KNOWN ISSUE / TODO: no returning-student flow — every launch re-runs onboarding

**Symptom:** a student who has already logged in once (phone + OTP, landed on
`/(student)/home`) gets sent through the *entire* onboarding journey again on every
subsequent app open — landing → role select → profile step 2 → step 3 → phone login →
OTP — instead of being recognized as already-authenticated and dropped straight onto
`/(student)/home`.

**Why this happens (likely cause, not yet root-caused):** `student-otp-verification.tsx`
writes a real Supabase session (`supabase.auth.setSession`) plus `AsyncStorage` keys
(`bb_role='student'`, `bb_student_id`, `bb_student_name`) on successful login, but nothing
in `onboarding.tsx` / the app's root/entry routing appears to check for an existing
session or these `AsyncStorage` keys on launch before routing the user into the
onboarding flow. Needs verification against `AuthContext.tsx` and whatever decides the
initial route (root `_layout.tsx` / index route) — this hasn't been read yet as part of
this note.

**What's needed:** a session-restore / "returning user" check on app boot (or at least on
the onboarding entry point) that reads the Supabase session + `bb_role`/`bb_student_id`
from `AsyncStorage` and, if present and valid, redirects straight to `/(student)/home`
(and presumably the equivalent owner dashboard for `bb_role='owner'`) instead of
rendering onboarding at all.

**Status:** identified but not yet designed or implemented. This affects both the
student and (likely) owner login paths — anywhere the onboarding flow is the only entry
point and nothing short-circuits it for an already-authenticated user.

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

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **BATCHBOOK_APP** (899 symbols, 1415 relationships, 11 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/BATCHBOOK_APP/context` | Codebase overview, check index freshness |
| `gitnexus://repo/BATCHBOOK_APP/clusters` | All functional areas |
| `gitnexus://repo/BATCHBOOK_APP/processes` | All execution flows |
| `gitnexus://repo/BATCHBOOK_APP/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
