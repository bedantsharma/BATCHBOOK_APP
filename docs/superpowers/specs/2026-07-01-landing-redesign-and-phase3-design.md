# Landing Redesign + UX Phase 3 — Design

> Last updated: 2026-07-01. Branch: `ux/foundation`.
> Companion docs: [UX_AUDIT.md](../../UX_AUDIT.md), [UX_ROADMAP.md](../../UX_ROADMAP.md).

This design covers two pieces of work requested together:

1. **Landing screen redesign** (new request) — fix the "stale, full of information" front
   screen so highlights show first and detail is on-demand.
2. **UX Roadmap Phase 3** (already spec'd in the roadmap) — state & form design.

---

## Part 1 — Landing screen redesign

### Problem
[landing.tsx](../../../src/app/(auth)/landing.tsx) stacks four feature cards between the
hero and the role CTAs. On smaller screens this pushes **"I'm a Student"** below the fold —
a student has to scroll to find their own entry point. The screen reads as a marketing wall,
not a decision point.

### Guiding principle (agreed with owner)
**Guide, don't overwhelm.** Surface one clear next action; keep feature/marketing detail out of
the decision moment. Information is available on demand, never in the way.

### New layout (top → bottom)
1. **Hero** — `LogoMark` + `BatchBook` + a single one-line tagline. Tighter top padding than
   today so it does not dominate.
2. **Role CTAs (immediately, above the fold)** — `I'm a Tutor →` (primary) and `I'm a Student`
   (secondary), full-width. Both reachable with **no scroll**. This is the core fix.
3. **Highlight strip** — the four features collapse into a **single swipeable card** showing one
   feature at a time, with page dots beneath. **Manual swipe only — no auto-advance** (owner's
   explicit choice). Sits *below* the CTAs so it never competes with the role decision.
4. **Footer** — the existing privacy line, muted.

### Components & behavior
- Horizontal paging `ScrollView` (`pagingEnabled`, `horizontal`) holding one feature card per
  page; an `onScroll`-driven active-dot indicator below it.
- Each feature page reuses `AppCard` + the existing `FEATURES` data (icon, title, desc).
- CTAs reuse `AppButton` (already has Phase 2 press + haptic liveliness).
- Page dots animate the active state with reanimated (already in project).
- Pure presentational refactor — **no new data, no backend, no route changes.** Both CTAs keep
  their current navigation (Tutor → phone-login; Student → onboarding with `role: 'student'`).

### Out of scope
- No change to onboarding/phone-login/OTP flows.
- No new copy/marketing beyond reusing the existing tagline + feature text.

---

## Part 2 — UX Roadmap Phase 3 (state & form design)

Executed as straight roadmap execution (already spec'd in
[UX_ROADMAP.md](../../UX_ROADMAP.md) Phase 3). Summary of the five steps:

- **3.1 Skeleton loaders** — new animated `Skeleton` component; replace full-screen/list
  `ActivityIndicator` on content loads (dashboard, owner lists) with skeleton rows shaped like
  the real content. Keep inline spinners for short blocking actions (save/pay).
- **3.2 Empty & error states** — upgrade the student dashboard's text-only empty states to the
  owner-list pattern (icon + copy + first-action button where relevant); add inline
  "Couldn't load — Retry" states where load errors are currently swallowed.
- **3.3 Real date/time pickers** — replace the free-text date fields in
  [attendance.tsx](../../../src/app/(owner)/attendance.tsx) and
  [tests.tsx](../../../src/app/(owner)/tests.tsx) with a native picker.
- **3.4 Keyboard handling** — wrap form modals (add student, create batch, create session,
  payment) in `KeyboardAvoidingView`.
- **3.5 Form validation** — standardize on per-field `error` via `AppInput`'s `error` prop
  (tests.tsx add-score form is the model); add a focus-state border style to `AppInput`.

**Golden rule honored:** migrate one screen end-to-end before rolling a pattern across all
screens (e.g. build `Skeleton` against one list first, then reuse).

---

## Sequencing
1. Landing redesign first (small, self-contained, highest owner interest).
2. Then Phase 3 steps in roadmap order (3.1 → 3.5), each shippable independently.
