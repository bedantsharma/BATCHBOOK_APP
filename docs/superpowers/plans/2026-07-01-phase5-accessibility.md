# Phase 5 — Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close out `docs/UX_ROADMAP.md` Phase 5 (Accessibility / audit gap G8) — the last unchecked phase — so every icon-only control has a screen-reader name, decorative icons don't create noisy VoiceOver/TalkBack output, no status is conveyed by color alone, contrast is verified against WCAG AA, and text containers survive OS font-scale increases without clipping.

**Architecture:** This is a refinement pass over an already-mostly-compliant codebase, not new infrastructure. Research (see "Findings" below) showed most of audit item G8 is already resolved by earlier phases (Phase 1–4 migrations added `accessibilityLabel`/`accessibilityRole` to most controls, and the `AppText` font-scale fix + `FilterChip` padding fix from the session log already address part of Dynamic Type reflow). This plan fixes the specific remaining gaps and formally verifies the rest, rather than re-doing work that's already done.

**Tech Stack:** React Native / Expo SDK 56, expo-router, `@expo/vector-icons` (MaterialIcons), existing `Touchable`/`AppButton`/`AppInput`/`AppCard`/`StatusChip` shared components.

## Global Constraints

- Don't disable `allowFontScaling` anywhere — that's the one forbidden "fix" called out in both `CLAUDE.md` and the roadmap.
- Keep the existing color palette and structure (per the 2026-06-30 product decision in `UX_AUDIT.md` Part 4: "Refine what exists"). Don't invent new tokens unless a real contrast failure is found.
- No test runner exists in this project (`package.json` has no `test` script, no Jest config, no `__tests__` dirs). Every prior phase verified with `npx tsc --noEmit` + manual/device checks — follow that same convention here rather than introducing a new test framework.
- Follow the codebase convention already established for this exact class of bug (`FilterChip` clipping fix, documented in `CLAUDE.md`): replace a fixed `height` that wraps user-facing text with `minHeight` (or padding), never leave a hard `height` on a text-containing box.

## Findings from research (read before starting — this scopes the tasks below)

1. **Icon-only controls**: nearly all already have `accessibilityRole="button"` + `accessibilityLabel` (add-buttons, month chevrons, per-student attendance toggle, remove/pay/remind actions — added incrementally in Phases 2–4). The **only** two remaining icon-only gaps are the expand/collapse carets:
   - `src/app/(owner)/attendance.tsx:251` (session card header — has `accessibilityRole="button"` but no label)
   - `src/app/(owner)/tests.tsx:312` (student score card header — same gap)
2. **Decorative icons next to text**: `src/app/(student)/profile.tsx:57,64,71` renders a `MaterialIcons` glyph immediately before an `AppText` with the same information (phone number, subjects, enrolled year) inside a `View` — a screen reader currently announces the icon and the text as two separate stops, which is noisy/redundant.
3. **Color-only status**: audited every place a semantic color (`C.success`/`warning`/`error`) is used for status — `students.tsx`, `fees.tsx` and `attendance.tsx` all route status through `StatusChip` (label + color) or pair the color with visible text (`PRESENT`/`ABSENT` + checkbox icon in `attendance.tsx:184-196`). **No color-only status instance found.** This is a verify-and-document task, not a code-change task.
4. **Contrast (`text3` = `rgba(255,255,255,0.55)`)**: computed WCAG contrast ratios (script in Task 4) show `text3` renders at **5.3–6.2:1** against every surface token in `colors.ts` (`bg`, `surface`, `surface2`, `surface3`) — comfortably above the 4.5:1 AA threshold for normal text. The audit's "borderline" flag was a precaution, not an actual failure. `C.error` as solid text is the one color that dips under 4.5:1 on `surface2`/`surface3` (4.26/3.88) — but every real usage of `color={C.error}` sits on `C.bg` or `C.surface` (`AppCard`/`BottomSheetModal` backgrounds), both of which pass at 4.6–5.2:1. **No contrast fix needed** — verify and document only.
5. **Dynamic Type reflow**: the `AppText` line-height scaling fix and the `FilterChip` `maxHeight`→padding fix (both already shipped, see `CLAUDE.md`) cover most of the app. Grepping for remaining fixed `height` values that wrap user-facing text found 4 more instances of the same bug class, not yet fixed:
   - `src/components/AppButton.tsx:54` (`height: 48` — every primary/secondary button label in the app)
   - `src/components/AppInput.tsx:49` (`height: 48` — every text input)
   - `src/components/DateTimeField.tsx:126` (`height: 48` — date/time picker field)
   - `src/app/(owner)/fees.tsx:865` (`actionBtn.height: 36` — Pay/Remind buttons)

---

### Task 1: Label the two remaining icon-only expand toggles

**Files:**
- Modify: `src/app/(owner)/attendance.tsx:251`
- Modify: `src/app/(owner)/tests.tsx:312`

**Interfaces:** No new exports; both edits are local JSX prop additions on an existing `Touchable`. `expanded` (boolean state) and `formatDate`/`displayName` are already in scope at both call sites — confirmed by reading the surrounding component in each file.

- [ ] **Step 1: Add `accessibilityLabel` + `accessibilityState` to the attendance session header**

In `src/app/(owner)/attendance.tsx`, find (around line 251):

```tsx
      <Touchable onPress={handleExpand} style={styles.sessionHeader} accessibilityRole="button">
```

Replace with:

```tsx
      <Touchable
        onPress={handleExpand}
        style={styles.sessionHeader}
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${formatDate(session.date)} session`}
        accessibilityState={{ expanded }}
      >
```

- [ ] **Step 2: Add `accessibilityLabel` + `accessibilityState` to the test score card header**

In `src/app/(owner)/tests.tsx`, find (around line 312):

```tsx
      <Touchable onPress={handleExpand} style={styles.cardHeader} accessibilityRole="button">
```

Replace with:

```tsx
      <Touchable
        onPress={handleExpand}
        style={styles.cardHeader}
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} scores for ${displayName}`}
        accessibilityState={{ expanded }}
      >
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (these are additive JSX props on an already-typed `Touchable`, which extends `PressableProps` and therefore already accepts `accessibilityLabel`/`accessibilityState`).

- [ ] **Step 4: Commit**

```bash
git add src/app/\(owner\)/attendance.tsx src/app/\(owner\)/tests.tsx
git commit -m "a11y: label the attendance/test expand-caret toggles"
```

---

### Task 2: Group decorative icon + text rows in the student profile screen

**Files:**
- Modify: `src/app/(student)/profile.tsx:56-74`

**Interfaces:** No new exports. Uses existing `s.infoRow` style from `src/lib/studentDashboardStyles.ts` (unchanged).

**Why this approach:** Setting `accessible` on the parent `View` makes React Native treat it as a single accessibility element on both iOS and Android — the `MaterialIcons` glyph and the `AppText` inside stop being individually focusable, and VoiceOver/TalkBack reads the one explicit `accessibilityLabel` instead of stitching together an icon (with no name) and the text as two stops. This needs no changes to `MaterialIcons` itself.

- [ ] **Step 1: Group the phone row**

In `src/app/(student)/profile.tsx`, find:

```tsx
        {profile?.phone ? (
          <View style={s.infoRow}>
            <MaterialIcons name="phone" size={18} color={C.text2} />
            <AppText variant="body" color={C.text2}>{profile.phone}</AppText>
          </View>
        ) : null}
```

Replace with:

```tsx
        {profile?.phone ? (
          <View style={s.infoRow} accessible accessibilityLabel={`Phone: ${profile.phone}`}>
            <MaterialIcons name="phone" size={18} color={C.text2} />
            <AppText variant="body" color={C.text2}>{profile.phone}</AppText>
          </View>
        ) : null}
```

- [ ] **Step 2: Group the subjects row**

Find:

```tsx
        {profile?.subjects && profile.subjects.length > 0 ? (
          <View style={s.infoRow}>
            <MaterialIcons name="school" size={18} color={C.text2} />
            <AppText variant="body" color={C.text2}>{profile.subjects.join(', ')}</AppText>
          </View>
        ) : null}
```

Replace with:

```tsx
        {profile?.subjects && profile.subjects.length > 0 ? (
          <View style={s.infoRow} accessible accessibilityLabel={`Subjects: ${profile.subjects.join(', ')}`}>
            <MaterialIcons name="school" size={18} color={C.text2} />
            <AppText variant="body" color={C.text2}>{profile.subjects.join(', ')}</AppText>
          </View>
        ) : null}
```

- [ ] **Step 3: Group the enrolled-year row**

Find:

```tsx
        {profile?.enrolledYear ? (
          <View style={s.infoRow}>
            <MaterialIcons name="calendar-today" size={18} color={C.text2} />
            <AppText variant="body" color={C.text2}>Enrolled {profile.enrolledYear}</AppText>
          </View>
        ) : null}
```

Replace with:

```tsx
        {profile?.enrolledYear ? (
          <View style={s.infoRow} accessible accessibilityLabel={`Enrolled ${profile.enrolledYear}`}>
            <MaterialIcons name="calendar-today" size={18} color={C.text2} />
            <AppText variant="body" color={C.text2}>Enrolled {profile.enrolledYear}</AppText>
          </View>
        ) : null}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(student\)/profile.tsx
git commit -m "a11y: group decorative icon+text rows in student profile"
```

---

### Task 3: Replace fixed `height` with `minHeight` on text-wrapping controls (Dynamic Type safety)

**Files:**
- Modify: `src/components/AppButton.tsx:54`
- Modify: `src/components/AppInput.tsx:49`
- Modify: `src/components/DateTimeField.tsx:126`
- Modify: `src/app/(owner)/fees.tsx:865`

**Interfaces:** Pure style-value edits (`height` → `minHeight`), no prop/type signature changes anywhere. `alignItems: 'center'` / `justifyContent: 'center'` (already present on every one of these styles) keeps content centered when the box grows past its floor — this is the same fix already applied to `FilterChip` (see `CLAUDE.md` "Project gotchas").

- [ ] **Step 1: `AppButton` — button label must not clip when the OS font scale is increased**

In `src/components/AppButton.tsx`, find:

```tsx
const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
```

Replace with:

```tsx
const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
```

(`paddingVertical: 8` keeps a visible gap around a taller label once `minHeight` is exceeded — at font scale 1 the 48px floor still wins, so this is a no-op visually today.)

- [ ] **Step 2: `AppInput` — text input must not clip typed/placeholder text**

In `src/components/AppInput.tsx`, find:

```tsx
  input: {
    height: 48,
    backgroundColor: C.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontSize: 15,
    color: C.text,
    borderWidth: 1,
    borderColor: C.outline,
  },
```

Replace with:

```tsx
  input: {
    minHeight: 48,
    backgroundColor: C.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
    borderWidth: 1,
    borderColor: C.outline,
  },
```

- [ ] **Step 3: `DateTimeField` — picker field must not clip the selected date/time text**

In `src/components/DateTimeField.tsx`, find:

```tsx
  field: {
    height: 48,
    backgroundColor: C.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.outline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
```

Replace with:

```tsx
  field: {
    minHeight: 48,
    backgroundColor: C.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.outline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
```

- [ ] **Step 4: `fees.tsx` — Pay/Remind action buttons must not clip their caption label**

In `src/app/(owner)/fees.tsx`, find:

```tsx
  actionBtn: {
    flex: 1,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
```

Replace with:

```tsx
  actionBtn: {
    flex: 1,
    minHeight: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual visual check at font scale 1 (regression check)**

Run: `npx expo start`, open the app in a simulator with default OS font size, and visually confirm buttons/inputs/date fields/Pay-Remind buttons look pixel-identical to before (they should — `minHeight` at content shorter than 48/36 renders identically to `height`).

- [ ] **Step 7: Commit**

```bash
git add src/components/AppButton.tsx src/components/AppInput.tsx src/components/DateTimeField.tsx src/app/\(owner\)/fees.tsx
git commit -m "fix: use minHeight instead of fixed height on text-wrapping controls to prevent Dynamic Type clipping"
```

---

### Task 4: Verify contrast + color-only-status, do a font-scale device pass, and close out Phase 5 in the roadmap

**Files:**
- Modify: `docs/UX_ROADMAP.md` (check off Phase 5 boxes, add a session-log entry)

**Interfaces:** None — documentation-only task, plus the verification commands below (no source changes).

- [ ] **Step 1: Run the contrast-ratio verification script**

Run:

```bash
node -e '
function srgbToLin(c){c=c/255; return c<=0.03928? c/12.92 : Math.pow((c+0.055)/1.055,2.4);}
function relLum(hex){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  const R=srgbToLin(r),G=srgbToLin(g),B=srgbToLin(b); return 0.2126*R+0.7152*G+0.0722*B;}
function blend(fg,bg,alpha){return fg.map((f,i)=>alpha*f+(1-alpha)*bg[i]);}
function relLumRgb(rgb){return relLum("#"+rgb.map(v=>Math.round(v).toString(16).padStart(2,"0")).join(""));}
function contrast(l1,l2){const [a,b]=[Math.max(l1,l2),Math.min(l1,l2)]; return (a+0.05)/(b+0.05);}
const white=[255,255,255];
const bgs={bg:"#121212",surface:"#1E1E1E",surface2:"#252525",surface3:"#2C2C2C"};
for (const [name,bg] of Object.entries(bgs)) {
  const bgRgb=[parseInt(bg.slice(1,3),16),parseInt(bg.slice(3,5),16),parseInt(bg.slice(5,7),16)];
  const composite = blend(white,bgRgb,0.55);
  console.log("text3 on",name,"->",contrast(relLumRgb(composite), relLum(bg)).toFixed(2));
}
const colors={error:"#CF6679"};
for (const [cname,chex] of Object.entries(colors)) for (const [bname,bhex] of Object.entries(bgs))
  console.log(cname,"on",bname,"->",contrast(relLum(chex), relLum(bhex)).toFixed(2));
'
```

Expected output: every `text3 on *` line ≥ 4.5, and `error on bg`/`error on surface` ≥ 4.5 (matches Findings §4 above — `error on surface2`/`surface3` will show below 4.5, which is fine because `grep -rn "C.error" src` confirms it's never rendered on those two backgrounds).

- [ ] **Step 2: Re-confirm no color-only status usage was introduced by Tasks 1-3**

Run: `grep -rn "C.success\|C.warning\|C.error" src/app src/components | grep -v node_modules`
Expected: every match is either inside a `StatusChip(...)` call (label+color), paired with visible text in the same block (as in `attendance.tsx`'s `PRESENT`/`ABSENT` rows), or a border/background accent (not the sole conveyor of a status word). If a new bare usage shows up, add a visible text label next to it before proceeding.

- [ ] **Step 3: Manual Dynamic Type device/simulator pass**

On a simulator or device, set the OS font size to its largest accessibility setting (iOS: Settings → Accessibility → Display & Text Size → Larger Text, drag to max; Android: Settings → Display → Font size, max) and walk through:
- Owner: batches, students, fees, attendance, tests (including expanding a session/test card, opening the create-batch/add-student/record-payment modals)
- Student: home, schedule, fees, profile
- Auth: landing, phone-login, otp-verification, onboarding

Confirm no text is visually clipped (cut top/bottom) and no button/input/date-field text overflows its container. This exercises the Task 3 fixes plus the already-shipped `AppText`/`FilterChip` fixes.

- [ ] **Step 4: Update `docs/UX_ROADMAP.md`**

Check off all four Phase 5 boxes (lines 191-197) and replace the "Phase 5 done when" line's implicit "not done" state by appending a completion note in the same style as Phases 1-4, e.g.:

```markdown
✅ **Phase 5 complete (<today's date>).** Labeled the two remaining icon-only
expand-caret toggles (attendance session header, test score card header);
grouped the student profile's decorative icon+text rows into single
accessibility elements. Audited contrast and color-only-status usage —
both were already compliant (StatusChip always pairs color with a label;
`text3` measures 5.3–6.2:1 against every surface token, well above the 4.5:1
AA floor). Closed the remaining Dynamic Type clipping risk by swapping fixed
`height` for `minHeight` on `AppButton`, `AppInput`, `DateTimeField`, and the
fees Pay/Remind buttons — the same fix already applied to `FilterChip`.
Verified with `tsc --noEmit` (clean) and a manual pass at the OS's largest
font-scale setting.
```

- [ ] **Step 5: Commit**

```bash
git add docs/UX_ROADMAP.md
git commit -m "docs: close out Phase 5 accessibility in UX_ROADMAP"
```

---

## Self-review notes (spec coverage)

- Roadmap checkbox "labels on icon-only controls" → Task 1 (the only real gaps left).
- Roadmap checkbox "contrast on `text3`" → Task 4 Step 1 (verified passing, documented — no arbitrary color change forced onto a passing token).
- Roadmap checkbox "Dynamic Type reflow, no clipping" → Task 3 (code fix) + Task 4 Step 3 (manual verification).
- Roadmap checkbox "no color-only status" → Task 4 Step 2 (verified passing, documented).
- Bonus gap found during research not on the original checklist but squarely inside audit G8/WCAG intent → Task 2 (decorative icon grouping in profile.tsx).
