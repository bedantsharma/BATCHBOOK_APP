# Returning-Student Login & Profile-Completion Flow — Design (Mobile)

**Date:** 2026-07-11
**Trigger:** Companion doc to
`BatchBook/docs/superpowers/specs/2026-07-11-returning-student-flow-design.md` — read that doc
first for the problem statement, the shared backend contract, and the "what counts as missing"
rules. This doc covers only the `BATCHBOOK_APP` (Expo) side of the same feature.
**Repos affected:** `BATCHBOOK_APP` only. Backend changes (new `PATCH` endpoints, extended
`VerifyParentResponse`) are specified in and owned by the `BatchBook` doc above — this app
consumes them, it doesn't define them.

---

## 1. Problem (mobile-specific)

- `landing.tsx` → "I'm a Student" → `onboarding.tsx` collects Student Name / Parent-Guardian Name
  / Parent Mobile Number across a 3-step wizard, `canContinue()` hard-requires name + 10-digit
  parent phone to advance (`onboarding.tsx:82-83`) — then routes to `student-phone-login.tsx`.
  **None of that collected data is ever sent to the backend.** `student-phone-login.tsx` only
  posts `{ phone }` to `/parent/generate_otp`, and `student-otp-verification.tsx` only posts
  `{ token, phone }` to `/parent/verify_otp` — the onboarding step is pure UI theater that delays
  every student, new or returning, by two unnecessary screens.
- `src/app/index.tsx` (root gate) checks `session` + `AsyncStorage['bb_role']` — if session exists
  and role is set, it correctly skips straight to `/(student)/home`. But if role is missing
  (cleared storage, restored on a new device) while a valid Supabase session persists, it falls
  through to `/(auth)/onboarding` — forcing the full flow on someone the backend already knows.

## 2. Changes

### 2.1 Skip onboarding's profile-collection step for students

`landing.tsx`'s "I'm a Student" button currently does
`router.push('/(auth)/onboarding', { params: { role: 'student' } })`. Change it to route directly
to `router.push('/(auth)/student-phone-login')`. `onboarding.tsx`'s student-role step 1/2/3
(role confirm → name/parent-name/parent-phone → "Continue to Login") is no longer part of the
student path at all — since none of its collected data was ever transmitted, removing it loses
nothing functionally and removes two friction screens for every student, every launch. (The owner
path through `onboarding.tsx` is untouched — this only changes the student branch.)

If `onboarding.tsx`'s student-role code becomes entirely dead after this change, remove it rather
than leaving an unreachable branch; if the file is shared enough that a clean removal is awkward,
leave a tracked follow-up rather than doing a partial/half removal.

### 2.2 Missing-field check after OTP verify

`student-otp-verification.tsx`, in the success branch of the `/parent/verify_otp` call (after the
existing Supabase `setSession` bridging and `AsyncStorage` stamping):

- `children.length === 0` → unchanged: existing "No student profile found... ask your tutor to
  add you first" error, no login.
- `children.length > 0` → compute missing fields from the **now-extended** verify response
  (`parent_name`, `children[0].email` — see backend doc §3.2). If `parent_name` is null, or the
  primary child's `name`/`email` is null → navigate to a new `complete-profile.tsx` screen
  (under `src/app/(auth)/`) that renders only the missing field(s) as inputs, submits via
  `PATCH /parent/update` (parent name) and/or `PATCH /parent/children/{id}` (child name/email) —
  then `router.replace('/(student)/home')`.
- If nothing is missing → `router.replace('/(student)/home')` immediately, exactly as today.

Multiple linked children: only the primary (`children[0]`, matching existing single-child
assumption already baked into `bb_student_id`/`bb_student_name` stamping) is checked/prompted for
now — a multi-child profile-completion UI is out of scope for this pass.

### 2.3 Session-restore fallback in the root gate

`src/app/index.tsx`, in the branch where `session` exists but `AsyncStorage['bb_role']` is
missing/empty: instead of falling straight through to `/(auth)/onboarding`, first call
`GET /parent/me`:
- 200 → this is a returning student session; stamp `bb_role='student'`,
  `bb_student_id`/`bb_student_name` from the response, run the same missing-field check as §2.2
  (using `GET /parent/me`'s existing `name`/`email` fields, since this path doesn't have a fresh
  verify response to read from), then route to `/(student)/home` (via `complete-profile.tsx` if
  needed).
- 401/expired → fall back to `/(auth)/landing` as today.

## 3. Error handling

- `complete-profile.tsx` `PATCH` failures: inline retry, no re-auth needed (token already valid).
- Zero-children blocker: unchanged copy and behavior.

## 4. Testing

No test files exist for this area today (confirmed during research) — this pass stays manual:
on-device QA of both paths per the backend doc's §7, run on this app specifically:
- Fresh install, tap "I'm a Student" → phone entry (no onboarding screens shown) → OTP → for a
  fully-complete existing account, land on `/(student)/home` directly.
- Same, but for an account with a missing parent name or child email → land on
  `complete-profile.tsx` first, submit, then `/(student)/home`.
- Clear `AsyncStorage['bb_role']` only (simulate storage loss) while Supabase session persists →
  relaunch → confirm `index.tsx` restores via `/parent/me` instead of dropping into onboarding.
- Zero-children phone number → confirm blocker still shows, unchanged.

Prior scratchpad notes (`mobile-task-4/5/6`) flagged that the original OTP wiring was never
manually verified on-device — don't repeat that gap here.
