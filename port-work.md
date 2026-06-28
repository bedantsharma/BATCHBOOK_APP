# BatchBook Expo Migration — Port Work Log

## What This Is
Migration of **batchbookui** (React 19 + Vite + MUI web app) to **BATCHBOOK_APP** (Expo SDK 56 + React Native 0.85.3).

**Source:** `/Users/bedantsharma/PycharmProjects/BatchBook/batchbookui/`
**Target:** `/Users/bedantsharma/PycharmProjects/BATCHBOOK_APP/`

## Agent Workflow

Every agent must:
1. **Read this file first** to understand what's been done and what's next.
2. **Code-review the previous agent's commits** (run `git log --oneline -5` and `git show` the last agent's commits — check for correctness, missing pieces, type errors).
3. **Fix any issues** from the previous agent's work before starting your own task.
4. **Implement your assigned task** (see Task List below).
5. **Update the Completed Work Log** at the bottom of this file with what you did.
6. **Commit everything** including the updated `port-work.md`.

## Constraint (READ THIS FIRST)
`AGENTS.md` says: **"Expo HAS CHANGED. Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code."**
Use the Context7 MCP tool (`mcp__plugin_context7_context7__resolve-library-id` then `mcp__plugin_context7_context7__query-docs`) to look up Expo SDK 56 / expo-router v4 docs before writing any Expo-specific code.

## Design Tokens (from batchbookui/src/theme/colors.js)
```
bg: '#121212'          surface: '#1E1E1E'     surface2: '#252525'
surface3: '#2C2C2C'    primary: '#BB86FC'     primary50: rgba(187,134,252,0.10)
secondary: '#03DAC6'   success: '#4CAF50'     warning: '#FB8C00'
error: '#CF6679'       text: '#FFFFFF'        text2: '#B0B0B0'
text3: rgba(255,255,255,0.55)   outline: rgba(255,255,255,0.10)
Font: DM Sans (via @expo-google-fonts/dm-sans)
Radius: sm=8, md=12, lg=16, xl=22
```

## Key Architecture Decisions
- `localStorage` → `@react-native-async-storage/async-storage` (all async)
- `import.meta.env.VITE_*` → `process.env.EXPO_PUBLIC_*`
- MUI components → React Native primitives (`View`, `Text`, `TextInput`, `Pressable`, `FlatList`)
- React Router → expo-router (file-based routing)
- MUI Snackbar → `react-native-toast-message`
- MUI Icons → `@expo/vector-icons` (MaterialIcons)
- SVG LogoMark → `react-native-svg`
- Supabase client needs `AsyncStorage` adapter for React Native

## File Structure (Target)
```
src/
  app/
    _layout.tsx          # Root: fonts + AuthProvider + ToastProvider
    index.tsx            # Role-based redirect (reads bb_role from AsyncStorage)
    (auth)/
      _layout.tsx        # Stack layout for auth screens
      landing.tsx        # Landing/welcome screen
      phone-login.tsx    # Phone number entry
      otp-verification.tsx
      onboarding.tsx     # OnboardingWizard
    (owner)/
      _layout.tsx        # Bottom tabs: Batches, Students, Fees, Attendance, Tests
      setup.tsx          # First-time owner setup (name + city)
      batches.tsx
      students.tsx
      fees.tsx
      attendance.tsx
      tests.tsx
    (student)/
      _layout.tsx        # Bottom tabs: Home, Batches, Schedule, Fees
      dashboard.tsx
    join/
      [joinCode].tsx     # Deep link handler
    privacy-policy.tsx
    +not-found.tsx
  components/
    AppButton.tsx        # Primary/secondary/text variants
    AppCard.tsx          # Dark surface card with radius 16
    AppInput.tsx         # TextInput with label + error state
    AppText.tsx          # Typography with size/weight props
    OtpInput.tsx         # 6-cell OTP with auto-focus
    LoadingScreen.tsx    # Full-screen ActivityIndicator
    LogoMark.tsx         # SVG logo (react-native-svg)
    ToastProvider.tsx    # react-native-toast-message setup
  constants/
    colors.ts            # Design tokens
  context/
    AuthContext.tsx      # session, user, loading, signOut + AsyncStorage
  lib/
    supabaseClient.ts    # Supabase JS with AsyncStorage adapter
    toastEmitter.ts      # Module-level event emitter
  services/
    api.ts               # Axios instance with JWT interceptor
    ownerService.ts      # All owner API calls (TypeScript)
    dashboardService.ts  # Student API calls (AsyncStorage for IDs)
```

## Task List

| # | Agent | Task | Screen/Module | Status |
|---|-------|------|---------------|--------|
| 1 | Agent 1 | Foundation | Delete templates, install deps, theme, supabase, auth context, services, shared UI, root layout | ✅ Done |
| 2 | Agent 2 | Landing Screen | `(auth)/landing.tsx` | ⬜ Pending |
| 3 | Agent 3 | Phone Login | `(auth)/phone-login.tsx` | ⬜ Pending |
| 4 | Agent 4 | OTP Verification | `(auth)/otp-verification.tsx` | ⬜ Pending |
| 5 | Agent 5 | Onboarding Wizard | `(auth)/onboarding.tsx` | ⬜ Pending |
| 6 | Agent 6 | Owner Setup | `(owner)/setup.tsx` + `(owner)/_layout.tsx` | ⬜ Pending |
| 7 | Agent 7 | Batches Screen | `(owner)/batches.tsx` | ⬜ Pending |
| 8 | Agent 8 | Students Screen | `(owner)/students.tsx` | ⬜ Pending |
| 9 | Agent 9 | Fees Screen | `(owner)/fees.tsx` | ⬜ Pending |
| 10 | Agent 10 | Attendance Screen | `(owner)/attendance.tsx` | ⬜ Pending |
| 11 | Agent 11 | Tests Screen | `(owner)/tests.tsx` | ⬜ Pending |
| 12 | Agent 12 | Student Dashboard | `(student)/_layout.tsx` + `(student)/dashboard.tsx` | ⬜ Pending |

## Completed Work Log

*(Each agent appends a section here when done)*

---
<!-- AGENTS APPEND BELOW THIS LINE -->

### Agent 1 — Foundation (2026-06-28)

**What was done:**
- Deleted Expo template boilerplate: `explore.tsx`, `animated-icon.*`, `app-tabs.*`, `external-link.tsx`, `hint-row.tsx`, `themed-text.tsx`, `themed-view.tsx`, `src/components/ui/` (collapsible.tsx), `web-badge.tsx`, `constants/theme.ts`, `hooks/use-color-scheme.*`, `hooks/use-theme.ts`
- Rewrote `src/app/_layout.tsx` and `src/app/index.tsx` from scratch (replacing template content)
- Installed via `npx expo install`: `@react-native-async-storage/async-storage`, `react-native-svg`, `react-native-toast-message`, `@expo-google-fonts/dm-sans`, `@supabase/supabase-js`, `axios`
- Created `src/constants/colors.ts` — all design tokens from source `colors.js`
- Created `src/lib/supabaseClient.ts` — Supabase client with AsyncStorage adapter (per Context7 docs)
- Created `src/lib/toastEmitter.ts` — module-level event emitter, TypeScript-typed
- Created `src/context/AuthContext.tsx` — session + user + role + loading + signOut; localStorage → AsyncStorage (all async); adds `role` state not in source
- Created `src/services/api.ts` — axios instance with JWT interceptor; VITE_* → EXPO_PUBLIC_*
- Created `src/services/ownerService.ts` — all owner API calls ported with TypeScript interfaces; uses actual backend paths from source (`/batch/`, `/enrollment/`, `/fee/`, `/attendance/`, `/scores/`)
- Created `src/services/dashboardService.ts` — full source logic ported with AsyncStorage replacing localStorage; `getStoredStudentId()` is now async
- Created shared components: `AppText`, `AppCard`, `AppButton`, `AppInput`, `OtpInput`, `LoadingScreen`, `LogoMark` (actual SVG path from LandingPage.jsx), `ToastProvider`
- Created `src/app/_layout.tsx` — DM Sans fonts + AuthProvider + ToastProvider; uses `SplashScreen.hideAsync()` pattern per Context7 docs
- Created `src/app/index.tsx` — role-based redirect reading `bb_role` from AsyncStorage
- Created placeholder screens for all 14 routes: `(auth)/landing`, `(auth)/phone-login`, `(auth)/otp-verification`, `(auth)/onboarding`, `(owner)/_layout`, `(owner)/batches`, `(owner)/students`, `(owner)/fees`, `(owner)/attendance`, `(owner)/tests`, `(owner)/setup`, `(student)/_layout`, `(student)/dashboard`
- Created `.env.example`
- `npx tsc --noEmit` passes with zero errors

**Known issues / notes for next agent:**
- `router.replace` calls in `index.tsx` use `as any` cast because `typedRoutes: true` in `app.json` generates types from the existing route tree, and this cast is safe — once the project is built/started Expo will regenerate its typed route map
- `ownerService.ts` uses the real backend paths from the source (`/batch/`, not `/owner/batches`) — do NOT change these to match the spec's simplified paths, as the actual backend uses the source paths
- `dashboardService.ts` is a full port of the source logic (date formatting, event mapping, etc.) not the simplified version in the spec — future agents should keep this richer implementation
- The `(owner)/_layout.tsx` and `(student)/_layout.tsx` are stubs with bare `<Tabs>` — Agents 6 and 12 will replace them with full tab bar configs including icons

**Commits:**
- feat: foundation — deps, theme, auth, services, shared UI, root layout
