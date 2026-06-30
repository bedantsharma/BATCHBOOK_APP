# BatchBook — UX Audit & Design Foundations

> **Purpose:** This document is the shared reference for improving the UX of the BatchBook app
> (React Native / Expo SDK 56 — a coaching-institute manager for tutors and students).
> It captures (1) a working definition of "good UX", (2) research-backed principles, and
> (3) a factual audit of where the current codebase falls short. Future agents should read this
> before making design/UX changes so work stays coherent.
>
> Last updated: 2026-06-30.

---

## Part 0 — Foundational UX Principles (our working definition)

"Good UX" is hard to state in one sentence, so we use a small set of foundations. Every UX
decision in this app should be checkable against at least one of these:

1. **The interface answers "what's happening?" at all times.** Loading, success, failure, and
   "nothing here yet" are all explicitly designed states — never a blank screen or a frozen tap.
2. **The system is systematic.** Spacing, type sizes, colors, and components come from a small,
   reused scale — not per-screen magic numbers. *Consistency is the single strongest signal of a
   professional vs. templated app.*
3. **Recognition over recall, and prevention over correction.** Show options instead of asking
   users to remember/type them; make invalid actions impossible rather than punishing them after.
4. **Every action gives feedback.** Taps respond (visual/haptic), saves confirm, destructive
   actions are reversible or confirmed. The app should feel *alive*, not static.
5. **Respect the thumb and the platform.** Primary actions are reachable and ≥44pt; the app
   behaves the way iOS/Android users already expect (Jakob's Law).
6. **Reduce what the user must think about.** Progressive disclosure, sensible defaults, chunked
   information. The screen surfaces the one thing that matters, not everything at once.
7. **Polish lives in the details.** Motion, alignment, density, and edge-case handling (zero / one
   / many / very long data) are what make an app feel crafted.

The throughline: **systematic consistency + always-visible state + responsive feedback.**

---

## Part 1 — Research-Backed Principles (reference)

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

## Part 2 — Current Codebase Audit (factual)

*Stack: expo-router (file-based), three route groups. Tokens live in `src/constants/colors.ts`.
Shared components in `src/components`.*

### What's already good ✅
- **Color & radius tokens are consistent** — nearly every screen imports `C` and `radius` from
  `src/constants/colors.ts` instead of hardcoding hex. Palette is a coherent dark, Material-inspired theme.
- **A real reusable component layer exists:** `AppText`, `AppButton`, `AppCard`, `AppInput`,
  `OtpInput`, `LoadingScreen`, `LogoMark`, `ToastProvider`.
- **Empty states on every owner list** (emoji + copy).
- **Pull-to-refresh** on all owner lists; lazy-loading + caching of scores/attendance.
- **Global error-toast interceptor** (`src/services/api.ts:55-64`) catches non-401 failures.
- **Sensible auth-guard routing**; `hitSlop` used on several small targets.

### The gaps 🔴

**G1 — No spacing or typography scale (biggest structural gap).**
Tokens exist only for color and radius. Font sizes are raw numbers on `AppText size={...}` — at least
**15 distinct sizes** (40/32/28/26/22/20/18/17/16/15/14/13/12/11/10) with no system. Section headings
alone vary: `22` (`students.tsx:354`) vs `20` (`dashboard.tsx:369`) vs `26` (`onboarding.tsx:95`).
Spacing is inline magic numbers (`marginBottom: 20/24/32`, `gap` of 4/6/8/10/12/14/16/24/28). This is
the root cause of the "something feels off" — there's no rhythm.

**G2 — Typography weights are broken.** `AppText` hardcodes `fontFamily: 'DMSans_400Regular'`
regardless of the `weight` prop (`src/components/AppText.tsx:24`). So `weight="700"` faux-bolds the
*regular* face. The Medium/SemiBold/Bold faces are loaded (`_layout.tsx:18-23`) but **never used** in
app code (only `AppButton` references SemiBold). Some `weight="800"` values aren't even loaded faces.

**G3 — No animation, no haptics, no pressed feedback.** `react-native-reanimated@4.3.1` is installed
but **never imported** (zero matches in `src`). Collapsible cards expand instantly. Most non-button
`Pressable`s (chips, arrows, "Remove", "Edit", "Pay") have **no pressed-state styling** — taps feel
dead. No `expo-haptics`. `@expo/ui`, `expo-glass-effect`, `expo-symbols` are installed but unused.

**G4 — No skeletons; loading is all raw spinners.** Every loading state is an `ActivityIndicator`.
Content screens (dashboard, lists) would feel faster with skeletons mirroring the layout.

**G5 — Inconsistent success feedback.** Toast on save in `attendance`/`tests`, native `Alert` in
`fees` (remind/payment), and **nothing** after add-batch / add-student / add-score. Mixed feedback
language makes the app feel incoherent.

**G6 — Student dashboard reinvents navigation.** Instead of expo-router tabs, `dashboard.tsx` renders
a hand-rolled absolute-positioned tab bar switching content via `useState` (`dashboard.tsx:839-894`).
Consequences: no deep-linking, no back-stack. Its pull-to-refresh handler (`:776`) is **defined but
never wired** to any ScrollView.

**G7 — Forms are error-prone.** **Dates/times are free-text** validated by regex
(`attendance.tsx:348`, `tests.tsx:149`) — in a *scheduling* app, with no date/time picker. Validation
is inconsistent (rich in `tests.tsx`, almost none in `students`/`batches`). Modals (add student,
create batch, create session, payment) have **no `KeyboardAvoidingView`** — the keyboard can cover
inputs. Per-field errors mostly unused; errors shown as one shared string at the bottom.

**G8 — Zero accessibility.** No `accessibilityLabel`/`accessibilityRole`/`accessible`/
`accessibilityHint` anywhere (grep: 0 matches). Icon-only "+" buttons, chevrons, and carets expose no
screen-reader name. No Dynamic Type support (`allowFontScaling` unset, fixed sizes). `text3`
(`rgba(255,255,255,0.55)`) used for hints is borderline for WCAG AA.

**G9 — Component/style duplication.** `students.tsx` re-implements a bare `TextInput` search bar
instead of reusing `AppInput`. `modalSheet`, `filterChip`, and `statusChip` styles are copy-pasted
across `fees`/`students`/`attendance`/`tests` rather than extracted. Ad-hoc alpha shading
(`statusColor + '22'`, `C.error + '1E'`) instead of the predefined `primary15/30/50` tokens.

### Gap → Principle map
| Gap | Violates |
|---|---|
| G1 spacing/type scale | Systematic consistency; 8pt grid; polish details |
| G2 broken weights | Visual hierarchy; typographic restraint |
| G3 no motion/haptics/press feedback | Feedback on every action; perceived quality |
| G4 no skeletons | Visibility of system status |
| G5 mixed success feedback | Consistency & standards |
| G6 reinvented student nav | Platform conventions; consistency |
| G7 form/date UX | Error prevention; recognition over recall |
| G8 accessibility | WCAG AA; inclusive design |
| G9 duplication | Systematic consistency (maintainability) |

---

## Part 3 — Priority Themes (for discussion)
Rough ordering by "impact on the *feeling* of quality" per unit effort:

- **A. Design-system foundation** (G1, G2, G9) — add spacing + type scales, fix font weights, extract
  shared components. Highest leverage; everything else sits on top of this.
- **B. Liveliness / feedback** (G3, G5) — pressed states, transitions, haptics, unified success feedback.
- **C. State design** (G4, G7) — skeletons, designed empty/error states, date pickers, keyboard handling.
- **D. Navigation coherence** (G6) — move student dashboard onto real router tabs.
- **E. Accessibility** (G8) — labels, contrast, Dynamic Type.

---

## Part 4 — Decision (2026-06-30, with product owner)

**Diagnosed feeling:** the app feels **static/dead** and **flat/unpolished** (symptoms point at motion,
depth, and responsive feedback — Theme B).

**Chosen direction:**
- **First focus → Theme A: Design-system foundation.** Even though the *feeling* is about liveliness,
  the foundation must come first: polish layered onto an inconsistent base just reads as more
  randomness. Build the system, then the polish lands.
- **Scope → Refine what exists.** Keep the structure and the (good) color scheme; layer improvements
  in incrementally. Low risk.

**Implied sequence:**
1. **Foundation (A):** spacing scale + type scale tokens; fix `AppText` weight→fontFamily bug (G2);
   replace raw font sizes/spacing with tokens; extract duplicated chip/modal/input components (G9).
2. **Liveliness (B) — the symptom fix:** pressed/active states on all touchables, subtle
   transitions via the already-installed reanimated, haptics on key actions, unified success feedback.
3. Then revisit C (state/forms), D (nav), E (a11y) as follow-ups.

*This ordering directly serves the "static/dead + flat" feeling — foundation removes the underlying
messiness so the liveliness work in step 2 reads as intentional polish, not noise.*
