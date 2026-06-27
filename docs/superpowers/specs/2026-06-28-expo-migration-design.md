# BatchBook — Web → Expo Migration Design

**Date:** 2026-06-28  
**Status:** Approved  
**Scope:** Migrate `batchbookui` (React 19 + Vite + MUI) to `BATCHBOOK_APP` (Expo SDK 56 + React Native 0.85.3)  
**Strategy:** Option A — Direct React Native primitives + custom theme system  
**Target platforms:** Android + iOS (single codebase)

---

## 1. Goals

- Port all existing screens and user flows from the web app to a native mobile app.
- Reuse the services layer (`api.ts`, `ownerService.ts`, `dashboardService.ts`) verbatim with minimal changes.
- Maintain the exact design language: dark theme (`#121212` bg, `#BB86FC` primary, DM Sans font, 16px card radius).
- Both user roles ship in a single app: Owner (bottom tab nav) and Student/Parent (stacked screens).
- Same FastAPI backend at `api.batchbook.in`. No backend changes needed.

---

## 2. Out of Scope

- The web app (`batchbookui`) continues to exist and is not modified.
- No new features beyond what currently exists in the web app.
- Push notifications, offline mode, and biometric auth are not included.
- App Store / Play Store submission setup is not included (separate task).

---

## 3. Architecture

### 3.1 Project Structure

```
BATCHBOOK_APP/
├── app.json                         ← Expo config (scheme: "batchbook" for deep links)
├── .env                             ← EXPO_PUBLIC_* env vars (not committed)
└── src/
    ├── app/
    │   ├── _layout.tsx              ← Root layout: AuthProvider + font loading + ToastProvider
    │   ├── index.tsx                ← Landing screen (public)
    │   ├── privacy-policy.tsx       ← Privacy policy (public)
    │   ├── join/
    │   │   └── [joinCode].tsx       ← Deep link enrollment screen
    │   ├── (auth)/
    │   │   ├── _layout.tsx          ← Stack navigator; redirects to role home if already authed
    │   │   ├── phone-login.tsx      ← Phone number input + OTP trigger
    │   │   ├── otp-verification.tsx ← 6-digit OTP entry
    │   │   └── onboarding.tsx       ← Multi-step onboarding wizard
    │   ├── (owner)/
    │   │   ├── _layout.tsx          ← Bottom tab navigator (5 tabs) + auth guard
    │   │   ├── setup.tsx            ← First-time institute setup (shown before tabs if needed)
    │   │   ├── batches.tsx          ← BatchesPage
    │   │   ├── students.tsx         ← StudentsPage
    │   │   ├── fees.tsx             ← FeesPage
    │   │   ├── attendance.tsx       ← AttendancePage
    │   │   └── tests.tsx            ← TestsPage
    │   └── (student)/
    │       ├── _layout.tsx          ← Stack; auth guard + role check
    │       └── dashboard.tsx        ← StudentDashboard (Home / Schedule / Profile tabs)
    ├── components/
    │   ├── ui/
    │   │   ├── AppButton.tsx        ← Primary / secondary / text variants
    │   │   ├── AppCard.tsx          ← View with radius 16, surface bg, shadow
    │   │   ├── AppInput.tsx         ← TextInput with dark theme styles
    │   │   ├── AppText.tsx          ← Text with DM Sans baked in
    │   │   ├── OtpInput.tsx         ← 6-cell OTP field with auto-focus
    │   │   ├── LoadingScreen.tsx    ← Full-screen ActivityIndicator
    │   │   ├── LogoMark.tsx         ← SVG logo via react-native-svg
    │   │   └── ToastProvider.tsx    ← react-native-toast-message wrapper
    │   ├── owner/
    │   │   ├── StatsBar.tsx         ← 3-pill stats header (enrolled / fees / attendance)
    │   │   ├── BatchCard.tsx        ← Single batch card in FlatList
    │   │   ├── CreateBatchModal.tsx ← Bottom sheet / Modal for batch creation
    │   │   ├── AddStudentModal.tsx  ← Modal for inviting a student
    │   │   ├── FeeSetupModal.tsx    ← Modal to set monthly fee amount
    │   │   ├── MarkPaymentModal.tsx ← Modal to record a payment
    │   │   └── AttendanceSheet.tsx  ← Multi-select attendance marking list
    │   └── student/
    │       ├── DashboardWidgets.tsx ← Home tab widgets (next class, fee status, etc.)
    │       └── ScheduleList.tsx     ← Today's / upcoming class list
    ├── context/
    │   └── AuthContext.tsx          ← Supabase session, useAuth hook, signOut
    ├── lib/
    │   ├── supabaseClient.ts        ← createClient with AsyncStorage adapter
    │   └── toastEmitter.ts          ← EventEmitter for global error toasts
    ├── services/
    │   ├── api.ts                   ← Axios instance + Supabase JWT interceptor
    │   ├── ownerService.ts          ← All owner API calls (batches, fees, attendance, etc.)
    │   └── dashboardService.ts      ← Student mock data service
    ├── theme/
    │   └── colors.ts                ← Design tokens (colors, radius)
    └── hooks/
        └── useAuth.ts               ← Re-export of useAuth from AuthContext
```

### 3.2 Web Route → Expo Route Mapping

| Web (react-router-dom) | Expo (file-based) |
|---|---|
| `/` | `app/index.tsx` |
| `/privacy-policy` | `app/privacy-policy.tsx` |
| `/phone-login` | `app/(auth)/phone-login.tsx` |
| `/otp-verification` | `app/(auth)/otp-verification.tsx` |
| `/onboarding` | `app/(auth)/onboarding.tsx` |
| `/join/:joinCode` | `app/join/[joinCode].tsx` |
| `/owner/setup` | `app/(owner)/setup.tsx` |
| `/owner/dashboard` → section: batches | `app/(owner)/batches.tsx` |
| `/owner/dashboard` → section: students | `app/(owner)/students.tsx` |
| `/owner/dashboard` → section: fees | `app/(owner)/fees.tsx` |
| `/owner/dashboard` → section: attendance | `app/(owner)/attendance.tsx` |
| `/owner/dashboard` → section: tests | `app/(owner)/tests.tsx` |
| `/dashboard/student` | `app/(student)/dashboard.tsx` |

---

## 4. Auth Layer

### 4.1 Supabase Client

```ts
// src/lib/supabaseClient.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### 4.2 AuthContext

Same shape as the web: `{ session, user, loading, signOut }`.  
`localStorage` → `AsyncStorage` (async calls, same keys: `bb_role`, `bb_student_id`, `bb_student_name`, `onboarding_profile`).

### 4.3 Role-Based Routing

Stored in AsyncStorage after OTP verification. Root `_layout.tsx` reads session + role on mount and redirects:

```
No session                       → /(auth)/phone-login
Session + bb_role = 'owner'     → /(owner)/batches
Session + bb_role = 'student'   → /(student)/dashboard
Session + no bb_role            → /(auth)/onboarding
```

### 4.4 Route Guards

Each group `_layout.tsx` enforces access using `<Redirect>` from `expo-router`:

```tsx
// app/(owner)/_layout.tsx
const { session, loading } = useAuth();
if (loading) return <LoadingScreen />;
if (!session) return <Redirect href="/(auth)/phone-login" />;
```

### 4.5 Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
EXPO_PUBLIC_API_BASE_URL=https://api.batchbook.in
```

For local dev, `EXPO_PUBLIC_API_BASE_URL=http://localhost:8000`.

---

## 5. Theme System

### 5.1 Colors (`theme/colors.ts`)

Direct copy of `batchbookui/src/theme/colors.js` with `as const` TypeScript annotation. No changes to any token values.

### 5.2 Fonts

Loaded via `useFonts()` from `@expo-google-fonts/dm-sans` in the root `_layout.tsx`. Splash screen held until fonts are ready via `expo-splash-screen`. JetBrains Mono loaded for monospace contexts.

### 5.3 Design Token Enforcement

All spacing, color, and radius values come from `theme/colors.ts`. No magic numbers in component files. The same `T = { bg, surface, primary, ... }` inline-object pattern used in the web app's `OwnerDashboard.jsx` is used in RN components, but sourced from `colors.ts`.

---

## 6. Component Strategy

### 6.1 MUI → React Native Mapping

| MUI Web | React Native |
|---|---|
| `Box` (layout) | `View` |
| `Box` (scrollable) | `ScrollView` |
| `Typography` | `Text` (+ `AppText` wrapper for DM Sans) |
| `Card` | `AppCard` (View with radius 16, surface bg, shadow) |
| `Button` (contained/text) | `AppButton` (Pressable with variants) |
| `TextField` | `AppInput` (TextInput with dark styles) |
| `CircularProgress` | `ActivityIndicator` |
| `Drawer` (permanent sidebar) | Expo Router bottom tabs |
| `Drawer` (temporary mobile) | `Modal` or `react-native-reanimated` slide panel |
| `IconButton` | `Pressable` wrapping `MaterialIcons` icon |
| MUI Icons | `@expo/vector-icons` — `MaterialIcons` (same icon names) |
| `Divider` | `View` with `height: 1, backgroundColor: C.outline` |
| `FlatList` patterns | `FlatList` from React Native |
| `Modal` | RN built-in `Modal` (full-screen or bottom sheet) |
| `Tooltip` | Omit (not idiomatic on mobile) |
| `useMediaQuery` | `useWindowDimensions()` |
| `Snackbar` / toast | `react-native-toast-message` |

### 6.2 Shared UI Primitives

Built before any screen work begins. Each is a thin wrapper enforcing the design tokens:

- **`AppButton`** — `variant: 'primary' | 'secondary' | 'text'`, border radius 16, DM Sans bold
- **`AppCard`** — `borderRadius: 16`, `backgroundColor: C.surface`, `elevation` shadow
- **`AppInput`** — `borderRadius: 12`, `C.surface2` background, `C.text` color, `C.outline` border
- **`AppText`** — `fontFamily: 'DMSans'`, accepts `size`, `weight`, `color` props
- **`OtpInput`** — 6 individual `TextInput` cells, auto-advances focus on each character
- **`LoadingScreen`** — full-screen View with centered `ActivityIndicator` in `C.primary`
- **`LogoMark`** — SVG rendered via `react-native-svg` (same path data as web)
- **`ToastProvider`** — `react-native-toast-message` configured with dark theme style

### 6.3 Icons

`@expo/vector-icons` `MaterialIcons` covers all icons used in the web app:
`People`, `Class`, `CurrencyRupee`, `EventNote`, `School`, `Logout`, `Menu`, `ArrowBack`, `Add`, `Close`.

### 6.4 SVG

`react-native-svg` for the BatchBook `LogoMark`. Same path data from the web's `OwnerDashboard.jsx`.

---

## 7. Services Layer

### 7.1 Change Summary

| File | What changes |
|---|---|
| `services/api.ts` | `import.meta.env.VITE_API_BASE_URL` → `process.env.EXPO_PUBLIC_API_BASE_URL` |
| `services/ownerService.ts` | Add TypeScript return-type interfaces; all function bodies unchanged |
| `services/dashboardService.ts` | Copy verbatim — pure JS mock data, no browser APIs |
| `lib/toastEmitter.ts` | Copy verbatim — plain EventEmitter |
| `context/AuthContext.tsx` | `localStorage` → `AsyncStorage`; `<Navigate>` → `<Redirect>` |
| `context/ToastContext.tsx` | Swap MUI `Snackbar` for `react-native-toast-message` calls |

### 7.2 API Instance (`services/api.ts`)

The axios interceptor pattern is identical to the web. Only the base URL env var key changes:

```ts
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});
```

---

## 8. Navigation

### 8.1 Owner Setup Screen

`app/(owner)/setup.tsx` is **not a tab** — it is a one-time full-screen flow shown when the owner has a session but has not yet created an institute. The `(owner)/_layout.tsx` checks for institute existence on mount (via `GET /owner/institute`) and conditionally renders either:

- `<Stack>` with `setup.tsx` as the only screen (no tab bar visible), or
- The 5-tab `<Tabs>` layout once setup is complete.

This mirrors the web's behaviour where `/owner/setup` was a separate protected route outside the dashboard.

### 8.2 Owner — Bottom Tabs

5 tabs matching the web sidebar sections. Each tab has a `MaterialIcons` icon:

| Tab | Icon | Screen |
|---|---|---|
| Batches | `class` | `(owner)/batches.tsx` |
| Students | `people` | `(owner)/students.tsx` |
| Fees | `currency-rupee` | `(owner)/fees.tsx` |
| Attendance | `event-note` | `(owner)/attendance.tsx` |
| Tests | `school` | `(owner)/tests.tsx` |

Tab bar background: `C.surface`. Active tint: `C.primary`. Inactive tint: `C.text2`.  
`StatsBar` (enrolled count / fees collected / avg attendance) renders as a sticky header inside each screen, not in the tab bar itself.

### 8.3 Student — Stack

`(student)/_layout.tsx` is a `Stack`. The single `dashboard.tsx` screen hosts three internal tabs (Home / Schedule / Profile) using a manually rendered tab-pill row at the top (a `View` with three `Pressable` pills, same pattern as the web's `StudentDashboard` which uses MUI Tabs). State is local: `const [tab, setTab] = useState<'home'|'schedule'|'profile'>('home')`.

### 8.4 Auth — Stack

`(auth)/_layout.tsx` is a `Stack` with `headerShown: false`. Screens push sequentially: phone-login → otp-verification → onboarding.

### 8.5 Deep Link — Join Institute

`app/join/[joinCode].tsx` handles the enrollment invite URL. Requires `scheme: "batchbook"` in `app.json`. The `useLocalSearchParams()` hook from expo-router reads the code. Logic ports from `JoinInstitute.jsx` verbatim.

---

## 9. Screen Migration Details

### Effort ratings: Low = <2h | Medium = 2–4h | High = 4–8h

| Screen | Effort | Key notes |
|---|---|---|
| Landing | Medium | Hero image via `expo-image`. Remove CSS animations. CTA → `AppButton`. |
| Phone Login | Low | `AppInput` + `AppButton`. Same Supabase `signInWithOtp` call. |
| OTP Verification | Low | Custom `OtpInput` with 6 cells and auto-focus. Same `verifyOtp` call. |
| Onboarding Wizard | Medium | Progress bar via View flex widths. Step logic copies exactly. Each step re-authored in RN primitives. |
| Owner Setup | Low | Simple form. Direct port. |
| Owner Dashboard shell | Low | Becomes bottom tab `_layout.tsx`. `StatsBar` becomes screen header. |
| Batches Page | High | `FlatList` for cards. Day-picker → horizontal `ScrollView` of pill buttons. `CreateBatchModal` → RN `Modal`. |
| Students Page | High | `FlatList` + `AppInput` search bar. `AddStudentModal` → RN `Modal` with invite form. |
| Fees Page | High | Month picker via scrollable pill row. Fee record rows in `FlatList`. Two modals (`FeeSetupModal`, `MarkPaymentModal`). |
| Attendance Page | High | Session list + `AttendanceSheet` with multi-select checkboxes (`TouchableOpacity` + tick icon toggle). |
| Tests Page | Medium | Score entry form + `FlatList` of scores grouped by batch. |
| Student Dashboard | Medium | Internal tab row (Home / Schedule / Profile). `DashboardWidgets` re-authored in RN. |
| Privacy Policy | Low | `ScrollView` + `AppText`. |
| Not Found | Low | Simple screen with back navigation. |
| Join Institute | Medium | Deep link screen. `useLocalSearchParams` for join code. Ports from `JoinInstitute.jsx`. |

---

## 10. Packages to Install

```bash
npx expo install @react-native-async-storage/async-storage
npx expo install react-native-svg
npx expo install expo-secure-store
npx expo install @supabase/supabase-js
npx expo install @expo-google-fonts/dm-sans
npx expo install expo-font
npm install axios
npm install react-native-toast-message
```

Already present in the Expo project (no install needed):
- `expo-router`, `react-native-reanimated`, `react-native-gesture-handler`
- `react-native-safe-area-context`, `react-native-screens`
- `@expo/vector-icons` (bundled with Expo)

---

## 11. Implementation Order

Work proceeds in this dependency order to keep the app runnable at every stage:

0. **Clean template** — delete all Expo default template files (`src/app/explore.tsx`, default `src/app/index.tsx`, all `src/components/*` template stubs, `src/constants/theme.ts`, `src/hooks/`). Keep only `app.json`, `package.json`, `tsconfig.json`, `src/global.css`, and the bare `src/app/` directory. This prevents template code from conflicting with the migration.

1. **Foundation** — packages, `theme/colors.ts`, `lib/supabaseClient.ts`, `lib/toastEmitter.ts`, `context/AuthContext.tsx`, `services/api.ts`, `services/ownerService.ts`, shared UI primitives (`AppButton`, `AppCard`, `AppInput`, `AppText`, `LoadingScreen`, `LogoMark`, `OtpInput`), root `_layout.tsx` with fonts + AuthProvider + ToastProvider.

2. **Auth screens** — Landing, Phone Login, OTP Verification, Onboarding Wizard. App is login-capable after this stage.

3. **Owner shell** — `(owner)/_layout.tsx` with bottom tabs, `StatsBar`, `OwnerSetup`. Owner can log in and see the tab shell.

4. **Owner screens (one at a time)** — Batches → Students → Fees → Attendance → Tests. Each screen is fully functional (not a placeholder) before moving to the next.

5. **Student flow** — `(student)/_layout.tsx` + `StudentDashboard` with all three internal tabs.

6. **Extras** — Privacy Policy, Not Found, Join Institute deep link, `app.json` scheme setup.

---

## 12. Known Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Supabase OTP on simulators | iOS Simulator receives SMS. Android emulator may not — test on a real device for OTP flows. |
| `expo-secure-store` size limits (2KB per entry) | Use `AsyncStorage` for large blobs (onboarding profile). Use `expo-secure-store` only for tokens if added. |
| Deep link universal links (iOS) require Apple entitlement | Start with custom scheme (`batchbook://`); add universal links (`batchbook.in`) as a follow-up. |
| `react-native-toast-message` needs root-level placement | `ToastProvider` renders `<Toast />` at the very bottom of root `_layout.tsx` to avoid z-index issues. |
| Expo SDK 56 / React Native 0.85.3 docs are at v56.0.0 | Always reference https://docs.expo.dev/versions/v56.0.0/ — do not rely on training data for APIs. |
