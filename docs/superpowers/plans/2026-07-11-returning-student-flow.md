# Returning-Student Flow (Mobile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Skip the onboarding profile-collection screens for students (their data was never sent to the backend anyway), add a post-OTP "what's missing?" check, and restore a valid session on launch even when the cached role is gone.

**Architecture:** `landing.tsx`'s student CTA jumps straight to `student-phone-login.tsx`. `student-otp-verification.tsx` computes missing fields from the now-extended `verify_otp` response (`parent_name`, `children[].email` — see the backend plan) and routes to a new `complete-profile.tsx` screen only when something is actually missing. `index.tsx`'s root gate falls back to `GET /parent/me` when a valid session exists but the cached `bb_role` doesn't.

**Tech Stack:** Expo Router, React Native, TypeScript, AsyncStorage, Supabase JS, axios (`src/services/api.ts`).

**Companion plan:** `BatchBook/docs/superpowers/plans/2026-07-11-returning-student-flow.md` — this plan's `PATCH /parent/update`, `PATCH /parent/children/{id}`, and extended `verify_otp` response all come from there. The backend plan's Tasks 1–3 should land (or at least be deployed to whatever backend this app points at) before Task 2 of this plan can be manually verified end-to-end, though the mobile code itself can be written against the documented contract regardless of merge order.

## Global Constraints

- **No test infrastructure exists in this repo** (confirmed: no jest config, no `*.test.*` files, `package.json` has no `test` script). Every task in this plan substitutes "write the code" + "manually verify on a running app" for the write-test-first cycle used in the backend/website plan — that's a deliberate deviation from this skill's default TDD steps, not an oversight.
- Route params passed between Expo Router screens must be primitives (strings) — booleans/numbers get stringified (`'1'`/`'0'`, `String(id)`) and parsed back on the receiving screen, matching the existing `useLocalSearchParams<{ phone: string }>()` pattern in `student-otp-verification.tsx`.
- Use `AppInput`, `AppButton`, `AppText`, `AppCard`, `LogoMark` from `src/components/` and `C`/`spacing` from `src/constants/` for any new screen — don't introduce new styling primitives.
- `AsyncStorage` keys already in use and not to be renamed: `bb_role`, `bb_student_id`, `bb_student_name`, `onboarding_profile`.

---

## Task 1: Landing skips onboarding for students

**Files:**
- Modify: `src/app/(auth)/landing.tsx:61-66`

**Interfaces:**
- Consumes: existing `/(auth)/student-phone-login` route (unchanged).
- Produces: nothing new — this is a routing-target change only.

- [ ] **Step 1: Change the "I'm a Student" button's destination**

In `src/app/(auth)/landing.tsx`, replace:

```tsx
          <AppButton
            label="I'm a Student"
            onPress={() => router.push({ pathname: '/(auth)/onboarding', params: { role: 'student' } } as any)}
            variant="secondary"
            style={styles.ctaBtn}
          />
```

with:

```tsx
          <AppButton
            label="I'm a Student"
            onPress={() => router.push('/(auth)/student-phone-login' as any)}
            variant="secondary"
            style={styles.ctaBtn}
          />
```

The "I'm a Tutor" button and `onboarding.tsx` itself are untouched — this only changes the student branch's entry point. `onboarding.tsx`'s student-role step 1/2/3 becomes unreachable from `landing.tsx` after this change; Task 2 removes that now-dead code from `onboarding.tsx` rather than leaving it as an orphaned branch.

- [ ] **Step 2: Manually verify**

Run: `cd /Users/bedantsharma/PycharmProjects/BATCHBOOK_APP && npx expo start`, open the app, tap "I'm a Student" from the landing screen. Confirm you land directly on the phone-number entry screen (`student-phone-login.tsx`'s "Parent's Mobile Number" field) — no role-select or name/parent-name form in between.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/landing.tsx
git commit -m "feat: route students straight to phone login, skip onboarding profile step"
```

---

## Task 2: Remove the now-dead student branch from `onboarding.tsx`

**Files:**
- Modify: `src/app/(auth)/onboarding.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — `onboarding.tsx` becomes owner-only.

Since `landing.tsx` (Task 1) never routes to `/(auth)/onboarding` with `role: 'student'` anymore, and the collected `name`/`parentName`/`parentPhone` data was never sent to the backend to begin with (confirmed during design research), the student branch of this screen is dead code. Remove it rather than leave an unreachable path — the owner branch (`role: 'owner'` preselected from `phone-login`'s equivalent entry, or manual role selection) stays fully intact.

- [ ] **Step 1: Simplify the `Profile` interface and remove student-only state**

Replace the top of `src/app/(auth)/onboarding.tsx` (imports unchanged) — change the `Role`/`Profile` types and initial state:

```tsx
type Role = 'owner' | 'student' | null;

interface Profile {
  role: Role;
  name: string;
}

const TOTAL_STEPS = 3;

export default function OnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const preselectedRole: Role =
    params.role === 'student' || params.role === 'owner' ? params.role : null;

  const [step, setStep] = useState(preselectedRole ? 2 : 1);
  const [profile, setProfile] = useState<Profile>({
    role: preselectedRole,
    name: '',
  });
  const [loading, setLoading] = useState(false);
```

`Role` keeps `'student'` as a possible value (role selection at step 1 still offers both cards — a student who somehow lands here manually by picking the "Student" card should still be routed onward, just without the now-removed name/parent-phone sub-form), only `Profile`'s student-only fields (`parentName`, `parentPhone`) are dropped.

- [ ] **Step 2: Simplify `handleContinue` and `canContinue`**

Replace:

```tsx
  const handleContinue = async () => {
    if (step === 2) {
      setStep(3);
      return;
    }
    if (step === 3) {
      setLoading(true);
      try {
        await AsyncStorage.setItem('onboarding_profile', JSON.stringify(profile));
        if (profile.role === 'owner') {
          router.replace('/(auth)/phone-login' as any);
        } else if (profile.role === 'student') {
          router.replace('/(auth)/student-phone-login' as any);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const canContinue = () => {
    if (step === 2 && profile.role === 'owner') return profile.name.trim().length > 0;
    if (step === 2 && profile.role === 'student') {
      return profile.name.trim().length > 0 && profile.parentPhone.trim().length === 10;
    }
    return true;
  };
```

with:

```tsx
  const handleContinue = async () => {
    if (step === 2) {
      setStep(3);
      return;
    }
    if (step === 3) {
      setLoading(true);
      try {
        await AsyncStorage.setItem('onboarding_profile', JSON.stringify(profile));
        if (profile.role === 'owner') {
          router.replace('/(auth)/phone-login' as any);
        } else if (profile.role === 'student') {
          router.replace('/(auth)/student-phone-login' as any);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const canContinue = () => {
    if (step === 2) return profile.name.trim().length > 0;
    return true;
  };
```

(`handleContinue`'s body is unchanged — a student who reaches step 3 via manual role selection still ends up at `student-phone-login`, same destination as Task 1's direct route, just via one extra step. Only `canContinue` drops the parent-phone requirement since that field no longer exists.)

- [ ] **Step 3: Remove the parent-name/parent-phone inputs from step 2's JSX**

Replace the step 2 block:

```tsx
        {/* Step 2: Profile Details */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <AppText variant="title" style={styles.stepTitle}>Your details</AppText>
            <AppText variant="body" color={C.text2} style={styles.stepSubtitle}>
              {profile.role === 'owner' ? 'Tell us your name' : 'Tell us about the student'}
            </AppText>
            <View style={styles.form}>
              <AppInput
                label={profile.role === 'owner' ? 'Your Name' : 'Student Name'}
                placeholder="Full name"
                value={profile.name}
                onChangeText={name => setProfile(p => ({ ...p, name }))}
                autoFocus
              />
              {profile.role === 'student' && (
                <>
                  <AppInput
                    label="Parent / Guardian Name"
                    placeholder="Full name"
                    value={profile.parentName}
                    onChangeText={parentName => setProfile(p => ({ ...p, parentName }))}
                  />
                  <AppInput
                    label="Parent Mobile Number"
                    placeholder="10-digit number"
                    value={profile.parentPhone}
                    onChangeText={t => setProfile(p => ({ ...p, parentPhone: t.replace(/\D/g, '').slice(0, 10) }))}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </>
              )}
              <AppButton
                label="Continue"
                onPress={handleContinue}
                disabled={!canContinue()}
                style={styles.continueBtn}
              />
            </View>
          </View>
        )}
```

with:

```tsx
        {/* Step 2: Profile Details */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <AppText variant="title" style={styles.stepTitle}>Your details</AppText>
            <AppText variant="body" color={C.text2} style={styles.stepSubtitle}>
              {profile.role === 'owner' ? 'Tell us your name' : 'Tell us your name'}
            </AppText>
            <View style={styles.form}>
              <AppInput
                label={profile.role === 'owner' ? 'Your Name' : 'Student Name'}
                placeholder="Full name"
                value={profile.name}
                onChangeText={name => setProfile(p => ({ ...p, name }))}
                autoFocus
              />
              <AppButton
                label="Continue"
                onPress={handleContinue}
                disabled={!canContinue()}
                style={styles.continueBtn}
              />
            </View>
          </View>
        )}
```

- [ ] **Step 4: Manually verify the owner path is unaffected**

Run the app, tap "I'm a Tutor →", and confirm the owner flow (role preselected → name step → phone login) still works exactly as before.

- [ ] **Step 5: Manually verify a manually-selected student role still reaches phone login**

From the landing screen, if there's any remaining way to reach `/(auth)/onboarding` without a preselected role (there isn't, after Task 1 — this step is a safety check), confirm picking "I'm a Student" on the role-select step still lands on `student-phone-login` after the simplified step 2/3.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(auth\)/onboarding.tsx
git commit -m "refactor: remove dead parent-name/parent-phone fields from onboarding step 2"
```

---

## Task 3: Post-OTP missing-field check + `complete-profile.tsx`

**Files:**
- Create: `src/lib/profileCompleteness.ts`
- Create: `src/app/(auth)/complete-profile.tsx`
- Modify: `src/app/(auth)/student-otp-verification.tsx`

**Interfaces:**
- Consumes: backend `PATCH /parent/update`, `PATCH /parent/children/{id}`, and the extended `verify_otp` response (`parent_name`, `children[].email`) from the companion backend plan.
- Produces: `computeMissingFields(parentName, child) -> { parentName: boolean; childEmail: boolean }` and `hasMissingFields(missing) -> boolean` — also consumed by Task 4's `index.tsx` change.

- [ ] **Step 1: Create the missing-field helper**

Create `src/lib/profileCompleteness.ts`:

```ts
export interface ChildProfile {
  name?: string | null;
  email?: string | null;
}

export interface MissingFields {
  parentName: boolean;
  childEmail: boolean;
}

export function computeMissingFields(
  parentName: string | null | undefined,
  child?: ChildProfile | null,
): MissingFields {
  return {
    parentName: !parentName,
    childEmail: !child?.email,
  };
}

export function hasMissingFields(missing: MissingFields): boolean {
  return Object.values(missing).some(Boolean);
}
```

- [ ] **Step 2: Update `student-otp-verification.tsx` to compute missing fields and route accordingly**

In `src/app/(auth)/student-otp-verification.tsx`, add the import:

```tsx
import { computeMissingFields, hasMissingFields } from '../../lib/profileCompleteness';
```

Update the `ChildSummary` interface:

```tsx
interface ChildSummary {
  id: number;
  name: string | null;
  email: string | null;
  fees_status: string;
}
```

Replace the body of `verify` from the `api.post` call through the `router.replace` line:

```tsx
        const { data } = await api.post('/parent/verify_otp', { token: code, phone });
        const children: ChildSummary[] = data.children ?? [];

        if (children.length === 0) {
          setError('No student profile found for this number. Ask your tutor to add you first.');
          setOtp('');
          return;
        }

        // Bridge backend JWT into the Supabase JS client
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.auth_token,
          refresh_token: data.refresh_token,
        });
        if (sessionError) throw sessionError;

        // Stamp student role + active child for route guard and dashboard data
        await AsyncStorage.setItem('bb_role', 'student');
        await AsyncStorage.setItem('bb_student_id', String(children[0].id));
        await AsyncStorage.setItem('bb_student_name', children[0].name ?? '');

        const missing = computeMissingFields(data.parent_name, children[0]);
        if (hasMissingFields(missing)) {
          router.replace({
            pathname: '/(auth)/complete-profile',
            params: {
              childId: String(children[0].id),
              missingParentName: missing.parentName ? '1' : '0',
              missingChildEmail: missing.childEmail ? '1' : '0',
            },
          } as any);
        } else {
          router.replace('/(student)/home' as any);
        }
```

- [ ] **Step 3: Create `complete-profile.tsx`**

Create `src/app/(auth)/complete-profile.tsx`:

```tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { AppText } from '../../components/AppText';
import C from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import api from '../../services/api';

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { childId, missingParentName, missingChildEmail } = useLocalSearchParams<{
    childId: string;
    missingParentName: string;
    missingChildEmail: string;
  }>();
  const needsParentName = missingParentName === '1';
  const needsChildEmail = missingChildEmail === '1';

  const [parentName, setParentName] = useState('');
  const [childEmail, setChildEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit =
    (!needsParentName || parentName.trim().length > 0) &&
    (!needsChildEmail || childEmail.trim().length > 0);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      if (needsParentName) {
        await api.patch('/parent/update', { name: parentName.trim() });
      }
      if (needsChildEmail) {
        await api.patch(`/parent/children/${childId}`, { email: childEmail.trim() });
      }
      router.replace('/(student)/home' as any);
    } catch {
      setError('Could not save your details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <AppText variant="title" style={styles.title}>Just one more thing</AppText>
        <AppText variant="body" color={C.text2} style={styles.subtitle}>
          A couple of details are still missing from your profile.
        </AppText>
        <View style={styles.form}>
          {needsParentName && (
            <AppInput
              label="Your Name"
              placeholder="Full name"
              value={parentName}
              onChangeText={setParentName}
              autoFocus
            />
          )}
          {needsChildEmail && (
            <AppInput
              label="Child's Email"
              placeholder="name@example.com"
              value={childEmail}
              onChangeText={setChildEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}
          {error ? <AppText variant="caption" color={C.error}>{error}</AppText> : null}
          <AppButton
            label="Continue"
            onPress={handleSubmit}
            loading={loading}
            disabled={!canSubmit || loading}
            style={styles.continueBtn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  title: { letterSpacing: -0.5, marginBottom: spacing.sm },
  subtitle: { lineHeight: 20, marginBottom: spacing.xxl },
  form: { gap: spacing.xl },
  continueBtn: { marginTop: spacing.sm },
});
```

`C.error` (`src/constants/colors.ts:14`, `'#CF6679'`) is already defined and used for error text elsewhere in the app.

- [ ] **Step 4: Manually verify the happy path (nothing missing)**

Using a phone number whose parent name and child email are both already set on the backend, log in via `student-phone-login` → OTP. Confirm you land directly on `/(student)/home`, no `complete-profile` screen shown.

- [ ] **Step 5: Manually verify the missing-field path**

Using a phone number with a linked child but no parent name (seed via `POST /admin/seed-demo-accounts` against a local backend, or null out a test parent's name directly in the DB), log in via OTP. Confirm you land on `complete-profile.tsx` with only "Your Name" shown (not "Child's Email", if the child's email is already set), and that submitting takes you to `/(student)/home`.

- [ ] **Step 6: Manually verify the zero-children blocker is unchanged**

Attempt login with a phone number that has never been invited by any tutor. Confirm the existing "No student profile found for this number. Ask your tutor to add you first." error still shows and no navigation happens.

- [ ] **Step 7: Commit**

```bash
git add src/lib/profileCompleteness.ts src/app/\(auth\)/complete-profile.tsx src/app/\(auth\)/student-otp-verification.tsx
git commit -m "feat: post-OTP missing-field check and complete-profile screen"
```

---

## Task 4: Session-restore fallback in the root gate

**Files:**
- Modify: `src/app/index.tsx`

**Interfaces:**
- Consumes: `computeMissingFields`/`hasMissingFields` from Task 3's `src/lib/profileCompleteness.ts`; `api` from `src/services/api.ts`; `GET /parent/me` from the companion backend plan.

Today, when a valid Supabase session exists but `AsyncStorage['bb_role']` is empty (cleared storage, restored on a new device), the root gate falls straight through to `/(auth)/onboarding` — forcing the whole flow on someone the backend already recognizes. This applies to owner sessions too (the code doesn't currently distinguish), so the fallback below tries `/parent/me` first; if the session actually belongs to an owner, that call 404s and the existing onboarding fallback still applies, same as today (one extra network round-trip, no behavior change for owners).

- [ ] **Step 1: Add the `/parent/me` fallback**

Replace the full contents of `src/app/index.tsx`:

```tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import api from '../services/api';
import { computeMissingFields, hasMissingFields } from '../lib/profileCompleteness';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRoute = any;

interface ParentMeChild {
  id: number;
  name: string | null;
  email: string | null;
}

export default function Index() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    (async () => {
      if (!session) {
        router.replace('/(auth)/landing' as AnyRoute);
        return;
      }
      const role = await AsyncStorage.getItem('bb_role');
      if (role === 'owner') {
        router.replace('/(owner)/batches' as AnyRoute);
        return;
      }
      if (role === 'student') {
        router.replace('/(student)/home' as AnyRoute);
        return;
      }

      // No cached role but a live session exists (cleared storage, new device) —
      // try to restore a student session before giving up to onboarding.
      try {
        const { data } = await api.get('/parent/me');
        const child: ParentMeChild | undefined = data.children?.[0];
        await AsyncStorage.setItem('bb_role', 'student');
        if (child) {
          await AsyncStorage.setItem('bb_student_id', String(child.id));
          await AsyncStorage.setItem('bb_student_name', child.name ?? '');
        }
        const missing = computeMissingFields(data.name, child);
        if (child && hasMissingFields(missing)) {
          router.replace({
            pathname: '/(auth)/complete-profile',
            params: {
              childId: String(child.id),
              missingParentName: missing.parentName ? '1' : '0',
              missingChildEmail: missing.childEmail ? '1' : '0',
            },
          } as AnyRoute);
        } else {
          router.replace('/(student)/home' as AnyRoute);
        }
      } catch {
        router.replace('/(auth)/onboarding' as AnyRoute);
      }
    })();
  }, [loading, session]);

  return <LoadingScreen />;
}
```

- [ ] **Step 2: Manually verify the restore path**

With the app running and logged in as a student, clear only the cached role — e.g. temporarily add a debug button calling `AsyncStorage.removeItem('bb_role')`, or use React Native Debugger / Flipper's AsyncStorage inspector to delete the `bb_role` key — then force-close and reopen the app. Confirm it briefly shows `LoadingScreen`, then either lands on `/(student)/home` (profile complete) or `/(auth)/complete-profile` (profile incomplete) — not `/(auth)/onboarding`. Remove any temporary debug button afterward.

- [ ] **Step 3: Manually verify the no-session path is unaffected**

Fully sign out (or fresh-install) and confirm the app still lands on `/(auth)/landing` as before.

- [ ] **Step 4: Commit**

```bash
git add src/app/index.tsx
git commit -m "feat: restore student session via /parent/me when cached role is missing"
```

---

## Task 5: Full manual QA pass

**Files:** none (verification only)

- [ ] **Step 1: Fresh install — new device, invited student, complete profile**

Seed or manually set up a parent+student with both parent name and child email already filled in. Fresh-install the app (or clear all app storage). Landing → "I'm a Student" → phone entry (no onboarding screens) → OTP → straight to `/(student)/home`.

- [ ] **Step 2: Same, but profile missing fields**

Same setup but with parent name null. Landing → "I'm a Student" → phone → OTP → `complete-profile.tsx` (only "Your Name" shown) → submit → `/(student)/home`.

- [ ] **Step 3: Returning student, app already installed with valid session**

After Step 1 or 2, force-close and reopen the app without clearing anything. Confirm it lands directly on `/(student)/home` with no screens shown in between (this path was already working via `index.tsx`'s existing `bb_role` check — confirm Task 4's changes didn't regress it).

- [ ] **Step 4: Session-restore fallback**

Per Task 4 Step 2.

- [ ] **Step 5: Zero-children blocker**

Per Task 3 Step 6.

- [ ] **Step 6: Owner path regression check**

Landing → "I'm a Tutor →" → confirm the full owner onboarding + phone-login + OTP path still works exactly as before (Tasks 1–2 only touched the student branch, but the shared `onboarding.tsx` file was edited in Task 2, so this needs explicit re-verification).
