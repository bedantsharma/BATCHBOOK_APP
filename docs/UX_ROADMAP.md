# BatchBook — UX Improvement Roadmap

> **How to use this:** Work top to bottom. Each phase ships independently — you can stop after any
> phase and the app is better than before. Within a phase, do steps in order. Check boxes as you go.
> Companion doc: [UX_AUDIT.md](UX_AUDIT.md) (the "why" + file:line references for every gap).
>
> **Direction (agreed):** Refine what exists — keep the structure and color scheme, layer in polish.
> Foundation first, then the liveliness that fixes the "static/dead, flat" feeling.
>
> Last updated: 2026-06-30.

---

## Phase 0 — Safety net (½ day)
*Do this before touching shared components, so you can refactor confidently.*

- [x] Create a branch: `git checkout -b ux/foundation`.
- [x] Screenshot the pre-auth flow (landing, phone-login, onboarding, OTP) — saved to
      `docs/screenshots/before/`. **Still pending:** owner screens (batches, students, fees,
      attendance, tests) and student dashboard tabs require a real login and must be captured
      manually on a device/simulator — see `docs/screenshots/before/README.md`.
- [x] Most broken screen (per audit G6): the **student dashboard** (`src/app/(student)/dashboard.tsx`) —
      it hand-rolls a `useState`-driven tab bar instead of using router tabs, and its pull-to-refresh
      handler is defined but never wired to a `ScrollView`. Re-check this screen first after Phase 4.

**Done when:** you have a branch + a folder of before screenshots.

---

## Phase 1 — Design-system foundation (the highest-leverage work)
*Goal: stop the "random spacing / random sizes" feeling. Everything else builds on this.*

### Step 1.1 — Add a spacing scale
- [x] Create `src/constants/spacing.ts` exporting an 8pt scale:
      `xs:4, sm:8, md:12, lg:16, xl:24, xxl:32, xxxl:40`.
- [x] Don't migrate screens yet — just create the token. (Migration is Step 1.4.)

### Step 1.2 — Add a typography scale + fix the weight bug
- [x] Create `src/constants/typography.ts` with a *small* named scale:
      `hero:40, display:32, title:26, heading:20, subheading:16, body:14, caption:12, micro:11`
      — each entry pairing `size`, `lineHeight` (~1.4×), and a `weight`. (Tuned from the example
      numbers to match the codebase's actual recurring sizes — see audit for rationale.)
- [x] **Fixed the font bug (audit G2):** `src/components/AppText.tsx` now maps the `weight` prop to the
      actual loaded face: `400→DMSans_400Regular, 500→DMSans_500Medium, 600→DMSans_600SemiBold,
      700→DMSans_700Bold`. The two `weight="800"` usages (dashboard.tsx) were dropped to `700`.
- [x] Added a `variant` prop to `AppText` (e.g. `variant="title"`) that pulls size+lineHeight+weight
      from the typography scale; `size`/`weight` props still override per-call when needed.

**Verify:** put a `weight="700"` text on screen — it should now look genuinely bold, not faux-bold.

### Step 1.3 — Tidy the color tokens (audit G9)
- [x] Replaced ad-hoc alpha concatenation (`statusColor + '22'`, `C.error + '1E'`, etc.) with a
      `withOpacity(color, level)` helper in `src/constants/colors.ts` (`soft`/`medium`/`strong` levels).
- [x] Moved the raw hex leaks (`#25D366` WhatsApp green, `#000` icon color) into named tokens
      (`C.whatsapp`, `C.onPrimary`).

### Step 1.4 — Migrate screens to the tokens (do ONE screen end-to-end first)
- [x] Piloted on `batches.tsx` — replaced every raw font size with a typography variant and every raw
      margin/padding/gap with a spacing token.
- [x] Reviewed the pilot, adjusted the scales (added `hero`/`xxxl`, tuned `title`/`heading` sizes to match
      actual recurring usage instead of the roadmap's placeholder numbers).
- [x] Rolled the same migration across: `students`, `fees`, `attendance`, `tests`, `dashboard`, and all
      auth screens (`landing`, `phone-login`, `otp-verification`, `onboarding`, `setup`).

### Step 1.5 — Extract duplicated components (audit G9)
- [x] Created `src/components/FilterChip.tsx` from the copy-pasted batch/filter chip
      (was duplicated in batches/fees/students/attendance/tests).
- [x] Created `src/components/StatusChip.tsx` for the status pills (Paid/Pending/Present/Absent etc.) —
      also fixed a stray `radius.lg` inconsistency on the student dashboard's fee chip (now `radius.sm`
      like every other status chip).
- [x] Created `src/components/BottomSheetModal.tsx` from the repeated `Modal` + `modalSheet` structure
      (used by 7 modals across batches/students/fees/attendance/tests).
- [x] Replaced `students.tsx`'s bare `TextInput` search bar with `AppInput`.

**Phase 1 done when:** no screen passes raw font sizes to `AppText`; spacing comes from tokens;
bold text renders with real bold faces; chips/modals come from shared components. Re-screenshot and
compare — it should already feel calmer and more intentional.

---

## Phase 2 — Liveliness & feedback (this fixes the "static/dead, flat" feeling)
*Goal: make the app feel alive and responsive. Now safe to do, on top of the consistent base.*

### Step 2.1 — Pressed/active states everywhere (audit G3)
- [x] Added a shared `Touchable` wrapper (`src/components/Touchable.tsx`) — a drop-in `Pressable`
      that dims to `pressedOpacity` (default 0.6) on press and can fire a light haptic via a `haptic`
      prop. `AppButton` also dims + buzzes on primary taps.
- [x] Applied it to every interactive `Pressable` that had none: filter chips (in the shared
      `FilterChip`), month arrows (fees + student dashboard), "Remove"/"Edit"/"Pay"/"Remind"/"Generate"
      actions, expand carets (attendance/tests session headers), "Mark All Present", "Add Score", the
      "+" add buttons, onboarding role cards + back, and the student dashboard tab bar.

### Step 2.2 — Motion (use the already-installed reanimated)
- [x] Animated the collapsible cards in `attendance.tsx` / `tests.tsx` — the expanded section now
      reveals with `FadeInDown` (springy) and exits with `FadeOut` instead of snapping open.
- [x] Replaced the static flex progress bars with `AnimatedProgressBar`
      (`src/components/AnimatedProgressBar.tsx`) — fills with `withTiming` on mount/change. Used by the
      batch capacity bar and the onboarding step bar.
- [x] Added a subtle staggered `FadeInDown` entrance to list cards (batches, students, fee records).

### Step 2.3 — Haptics on key actions
- [x] Added `expo-haptics` + a `src/lib/haptics.ts` wrapper (`tap`/`toggle`/`success`/`warning`,
      fire-and-forget, never throws). Fires: selection on attendance toggle / Mark All / chips,
      light tap on primary buttons + key Touchables, success notification on save score / record
      payment / send reminder / create batch / session / add student.

### Step 2.4 — Unify success feedback (audit G5)
- [x] Standardized on the existing toast for every successful write: add batch, add student (both
      modals), add score, create session, record payment, send reminder, save fee structure, remove
      student. Replaced the native `Alert` success calls in `fees.tsx` (payment / reminder) with the
      toast. Error states intentionally keep `Alert`.
- [x] The previously-silent writes (add-batch / add-student / add-score) now confirm via toast + haptic.

**Phase 2 done when:** every tap visibly responds, expands animate, key actions buzz subtly, and
success always confirms the same way. This is the moment the "dead/flat" feeling should lift.

✅ **Phase 2 complete (2026-06-30).** New shared pieces: `Touchable`, `AnimatedProgressBar`,
`lib/haptics`. Verified with `tsc --noEmit` (clean) and an iOS production bundle export (reanimated's
worklet transform bundles fine — it was previously installed-but-unused). The pre-auth bug where
"I'm a Student" re-asked the role was also fixed (landing now passes the role; onboarding skips step 1).

---

## Phase 3 — State & form design (remove friction)
*Goal: no dead screens, no error-prone typing.*

### Step 3.1 — Skeleton loaders (audit G4)
- [ ] Create a `Skeleton` component (animated shimmer). Replace the full-screen/list `ActivityIndicator`
      on content loads (dashboard, owner lists) with skeleton rows shaped like the real content.
- [ ] Keep spinners only for short blocking actions (save/pay button inline spinner).

### Step 3.2 — Empty & error states polish
- [ ] Upgrade text-only empty states (student dashboard `:278,307,476,555`) to match the owner lists'
      pattern (icon/illustration + explanatory copy + a first-action button where relevant).
- [ ] Make load errors recoverable: where errors are currently swallowed and rely on the global toast,
      add an inline "Couldn't load — Retry" state on the main content screens.

### Step 3.3 — Real date/time pickers (audit G7)
- [ ] Replace free-text date fields (`attendance.tsx:348`, `tests.tsx:149`) with a native date picker
      (`@react-native-community/datetimepicker` or expo equivalent). This is a *scheduling* app —
      typing `YYYY-MM-DD` by hand is the most error-prone interaction in it.

### Step 3.4 — Keyboard handling in modals (audit G7)
- [ ] Wrap form modals (add student, create batch, create session, payment) in `KeyboardAvoidingView`
      so the keyboard never covers the input being typed. (Currently only `phone-login`/`setup` have it.)

### Step 3.5 — Consistent form validation
- [ ] Standardize on per-field `error` via `AppInput`'s existing `error` prop (the `tests.tsx`
      add-score form is the good model — copy its approach to `students`/`batches` add modals).
- [ ] Add a focus state style to `AppInput` (highlight border on focus) — small but makes forms feel responsive.

**Phase 3 done when:** loads show skeletons, every list has a designed empty/error state, dates are
picked not typed, and no keyboard covers an input.

---

## Phase 4 — Navigation coherence (audit G6)
*Goal: the student side behaves like the rest of the app and the platform.*

- [ ] Move the student dashboard's hand-rolled `useState` tab bar onto real expo-router `Tabs`
      (Home / Schedule / Fees / Profile), mirroring the owner layout. Enables deep-linking + back-stack.
- [ ] Wire the **already-defined but unconnected** pull-to-refresh: the `onRefresh`/`refreshing` state
      at `dashboard.tsx:776` is never passed to a `ScrollView` — attach a `RefreshControl`.

**Phase 4 done when:** student tabs are router-driven and pull-to-refresh actually refreshes.

---

## Phase 5 — Accessibility (audit G8)
*Goal: usable with a screen reader and large text; meets WCAG AA.*

- [ ] Add `accessibilityLabel` + `accessibilityRole="button"` to every icon-only control (the "+" add
      buttons, month chevrons, expand carets).
- [ ] Check contrast: `text3` (`rgba(255,255,255,0.55)`) on dark surfaces is borderline for small text —
      bump opacity or reserve it for large/decorative text only. Target 4.5:1 for body copy.
- [ ] Test with the OS font size cranked up; ensure layouts reflow without clipping (don't disable
      `allowFontScaling`).
- [ ] Confirm no status is conveyed by color alone (pair every colored status with a label/icon).

**Phase 5 done when:** VoiceOver/TalkBack can name every control, body text passes 4.5:1, and large
type doesn't break layouts.

---

## Suggested cadence
| Phase | Theme | Rough effort | Ship independently? |
|---|---|---|---|
| 0 | Safety net | ½ day | — |
| 1 | Design-system foundation | 2–4 days | ✅ biggest visible win |
| 2 | Liveliness & feedback | 2–3 days | ✅ fixes the "dead" feeling |
| 3 | State & forms | 2–3 days | ✅ |
| 4 | Navigation | 1 day | ✅ |
| 5 | Accessibility | 1–2 days | ✅ |

**Golden rule:** migrate one screen end-to-end before rolling a change across all screens — it lets you
fix the *system* (the scale/component) once instead of fighting it on every screen.
