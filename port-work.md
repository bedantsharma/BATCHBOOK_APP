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
| 2 | Agent 2 | Landing Screen | `(auth)/landing.tsx` | ✅ Done |
| 3 | Agent 3 | Phone Login | `(auth)/phone-login.tsx` | ✅ Done |
| 4 | Agent 4 | OTP Verification | `(auth)/otp-verification.tsx` | ✅ Done |
| 5 | Agent 5 | Onboarding Wizard | `(auth)/onboarding.tsx` | ✅ Done |
| 6 | Agent 6 | Owner Setup | `(owner)/setup.tsx` + `(owner)/_layout.tsx` | ✅ Done |
| 7 | Agent 7 | Batches Screen | `(owner)/batches.tsx` | ✅ Done |
| 8 | Agent 8 | Students Screen | `(owner)/students.tsx` | ✅ Done |
| 9 | Agent 9 | Fees Screen | `(owner)/fees.tsx` | ✅ Done |
| 10 | Agent 10 | Attendance Screen | `(owner)/attendance.tsx` | ✅ Done |
| 11 | Agent 11 | Tests Screen | `(owner)/tests.tsx` | ✅ Done |
| 12 | Agent 12 | Student Dashboard | `(student)/_layout.tsx` + `(student)/dashboard.tsx` | ⬜ Pending |

## Completed Work Log

*(Each agent appends a section here when done)*

---
<!-- AGENTS APPEND BELOW THIS LINE -->

### Agent 11 — Tests Screen (2026-06-28)

**What was done:**
- Reviewed Agent 10's attendance screen — no issues found. Confirmed: batch selector chips auto-selecting first batch, sessions FlatList with expand/collapse, lazy attendance load with caching, AttendanceSheet with checkbox rows and "Save Attendance" button, CreateSessionModal with date/start_time/end_time/topic fields, pull-to-refresh, empty states for no-batches and no-sessions. `npx tsc --noEmit` passed with zero errors before starting.
- Implemented `src/app/(owner)/tests.tsx` (replaced placeholder)
  - Batch selector chips (horizontal ScrollView, same pattern as fees/students/attendance screens); auto-selects first batch on mount; switching batch clears score cache
  - `loadEnrollments(batchId)` fetches `getEnrollmentsByBatch(batchId)`, filters to `is_active !== false`, stores as `EnrollmentRow[]`
  - FlatList of `StudentCard` items; each shows student name, score count (once loaded)
  - Lazy score loading: first expand triggers `getStudentScores(enrollmentId)`, result stored in `scoreCache: Record<number, TestScore[]>`; subsequent expand/collapse reuses cache without re-fetching
  - Scores displayed as `ScoreRow` items: test_name (bold), subject · date (secondary), obtained_marks/max_marks ("85 / 100"), percentage chip — ≥75%=C.success, ≥50%=C.warning, <50%=C.error
  - "Add Score" button per student (shown when card is expanded): opens `AddScoreModal` as bottom sheet
  - `AddScoreModal` fields match ACTUAL `TestScoreData` interface: `test_name`, `subject`, `date` (YYYY-MM-DD, pre-filled today), `max_marks`, `obtained_marks`; validation: all required, marks range check; calls `createTestScore({ enrollment_id, test_name, subject, date, max_marks, obtained_marks })` → prepends new score to cache
  - Pull-to-refresh: clears `scoreCache`, reloads batches and enrollments
  - Empty states: "No batches found" at batch level, "No students in this batch" inside FlatList, "No scores yet" inside each expanded student card
  - `npx tsc --noEmit` passes with zero errors after implementation

**Notes for Agent 12 (Student Dashboard):**
- Source: `/Users/bedantsharma/PycharmProjects/BatchBook/batchbookui/src/components/student/StudentDashboard.jsx`
- Files to create/replace:
  - `src/app/(student)/_layout.tsx` — replace placeholder with real bottom tabs (4 tabs: Home, Schedule, Fees, Profile)
  - `src/app/(student)/dashboard.tsx` — replace placeholder with the student dashboard
- The student layout needs an auth guard: no session → redirect to `/(auth)/landing`; role !== 'student' → redirect to `/(auth)/onboarding`
- Dashboard is a multi-tab screen. On mobile it was already tab-based in the source.
- Home tab: student profile header, today's schedule (getTodaySchedule), upcoming events (getUpcomingEvents)
- Schedule tab: attendance summary for current month (getAttendance(month))
- Fees tab: fee status for current month (getFeeStatus(month)), month picker
- Profile tab: student name, parent info; sign out button (useAuth().signOut())
- All API from `../../services/dashboardService`
- AsyncStorage keys: bb_student_id, bb_student_name
- Use `useAuth()` from `../../context/AuthContext` for session and signOut
- Tab icons: Home=home, Schedule=calendar-today, Fees=account-balance-wallet, Profile=person

**Commits:**
- feat: tests screen with student score cards, add score modal

### Agent 10 — Attendance Screen (2026-06-28)

**What was done:**
- Reviewed Agent 9's fees screen — no issues found. Confirmed: month picker with ‹/› arrows defaulting to current month, 4 summary cards in 2×2 grid from `getFeeDashboard`, batch selector chips (active batches only), fee record list with Pay and Remind buttons (hidden when PAID), Mark Payment modal (pre-filled amount_due + optional reference), Fee Setup modal, pull-to-refresh. `npx tsc --noEmit` passed with zero errors before starting.
- Implemented `src/app/(owner)/attendance.tsx` (replaced placeholder)
  - Batch selector chips (horizontal ScrollView, same pattern as fees/students) — auto-selects first batch on mount
  - `loadBatchData(batchId)` fetches `getEnrollmentsByBatch` + `getBatchSessions` in parallel via `Promise.all`; filters enrollments to `is_active !== false`; sorts sessions newest-first
  - FlatList of `SessionCard` items, each showing date (formatted with `en-IN` locale: "Mon, 28 Jun 2026"), optional topic subtitle, expand/collapse chevron
  - Lazy attendance load: first expand triggers `getSessionAttendance(sessionId)`, result cached in component state; subsequent expands/collapses use cached data
  - Attendance summary chip shown once loaded: "X/Y present" in green (all present) or amber (partial)
  - Inline `AttendanceSheet` when expanded: present/absent count chips, "Mark All Present" shortcut, one `Pressable` row per active enrollment with `MaterialIcons` `check-box` / `check-box-outline-blank` toggle, "Save Attendance" button → `markAttendance(sessionId, [...presentIds])` → `toastEmitter.emit('Attendance saved!', 'success')`
  - `+` button in header opens `CreateSessionModal`: date (YYYY-MM-DD, pre-filled today), start_time (HH:MM, default 16:00), end_time (HH:MM, default 17:00), topic (optional); `appendSeconds()` helper converts HH:MM → HH:MM:00; calls `createSession(SessionData)` then refreshes session list
  - Pull-to-refresh via `RefreshControl` re-runs `loadBatchData`
  - No-batches empty state (points to batches tab); no-sessions empty state per batch
  - TypeScript: local `Session` interface for `getBatchSessions` (`unknown[]`) cast; local `AttendanceRow` for `getSessionAttendance`/`markAttendance` (`unknown`) cast; `EnrollmentRow = Enrollment & { student_name?: string }` for API-enriched field
- `npx tsc --noEmit` passes with zero errors after implementation

**Notes for Agent 11 (Tests Screen):**
- Source: `/Users/bedantsharma/PycharmProjects/BatchBook/batchbookui/src/pages/owner/TestsPage.jsx`
- File to replace: `src/app/(owner)/tests.tsx`
- Batch selector at top (same chip pattern)
- Per batch: load enrollments with `getEnrollmentsByBatch(batchId)`
- Per enrollment: load scores with `getStudentScores(enrollmentId)`
- Show students in a list; tap to expand and see their scores
- "Add Score" button per student opens a modal: test_name, score, max_score, test_date (YYYY-MM-DD) → `createTestScore({ enrollment_id, test_name, score, max_score, test_date })`
- Score row: test name, score/max (e.g. "85 / 100"), percentage, date
- Percentage color: ≥75%=C.success, ≥50%=C.warning, <50%=C.error
- All API from ownerService; read actual field names
- Note: `TestScoreData` in ownerService has fields: `enrollment_id`, `test_name`, `subject`, `date`, `max_marks`, `obtained_marks` — NOT `score`/`max_score`/`test_date`; read ownerService.ts carefully before writing

**Commits:**
- feat: attendance screen with session list, create session, attendance sheet

### Agent 9 — Fees Screen (2026-06-28)

**What was done:**
- Reviewed Agent 8's students screen — no issues found. Confirmed: loads all batches then enrollments per batch in parallel with `Promise.all`, batch filter chips with `number | 'all'` state, search bar (client-side, case-insensitive), enrollment cards with student name/batch/fee status chip/remove button, `Alert.alert` confirmation before remove, Add Student modal with batch selector chips, pull-to-refresh with `RefreshControl`. `npx tsc --noEmit` passed with zero errors before starting.
- Implemented `src/app/(owner)/fees.tsx` (replaced placeholder)
  - Month picker with `‹` / `›` arrow buttons and formatted label (e.g. "Jun 2026"); defaults to current month via `new Date().toISOString().slice(0, 7)`; `prevMonth`/`nextMonth` helpers using `Date.setMonth`
  - 4 summary cards in a 2×2 grid from `getFeeDashboard(month)`: Total Due (primary), Collected (success), Pending (warning), Collection Rate (secondary)
  - Batch selector chips (horizontal ScrollView, same chip pattern as students screen); filters to active batches only (`status !== 'ARCHIVED'`); auto-selects first batch on load
  - Per-batch: loads `getFeeStructure(batchId)` — if null/404, shows "Set Up Fees" button; otherwise shows monthly fee chip with "Edit" link
  - "Generate Records" button shown inline when structure exists but records list is empty → calls `generateMonthlyRecords(batchId, month)`
  - FlatList of fee records (FeeRecordRow) — student name (denormalized from API), amount due, amount paid, status chip, "Pay" and "🔔 Remind" buttons (hidden when status=PAID)
  - Fee status chip: PAID=`C.success`, PARTIAL=`C.warning`, PENDING/NOT_PAID=`C.error`; handles both web enum names and ownerService names
  - Mark Payment modal: amount_paid (pre-filled with amount_due), reference (optional); calls `markPayment(recordId, amount, reference)`; updates record in list + refreshes dashboard
  - Fee Setup modal: monthly_amount field; calls `setupFeeStructure(batchId, monthlyAmount)`; reloads structure + records + dashboard
  - Remind button: calls `sendFeeReminder(recordId)` directly, tracks in-flight ids via `Set<number>`, shows "Sending…" while pending
  - Pull-to-refresh on full FlatList (calls all four load functions in parallel)
  - TypeScript fix: removed `status === 'FULLY_PAID'` comparison (not in `FeeRecord.status` union type in ownerService.ts; only `'PAID'` is the canonical paid value)
- `npx tsc --noEmit` passes with zero errors after implementation

**Notes for Agent 10 (Attendance Screen):**
- Source: `/Users/bedantsharma/PycharmProjects/BatchBook/batchbookui/src/pages/owner/AttendancePage.jsx`
- File to replace: `src/app/(owner)/attendance.tsx`
- Batch selector at top (same chip pattern)
- Session list: each session shows date, topic, expand/collapse for attendance details
- Create Session form/modal: date + topic fields → `createSession({ batch_id, date, topic })`
- Mark Attendance: expandable per-session list of students with checkboxes → `markAttendance(sessionId, presentEnrollmentIds[])`
- Get sessions: `getBatchSessions(batchId)`
- Get session attendance: `getSessionAttendance(sessionId)` — returns which enrollments were present
- Get enrollments for batch: `getEnrollmentsByBatch(batchId)` — to show the full attendance sheet
- Attendance summary per student: `getStudentAttendanceSummary(enrollmentId, month)` — optional, show if useful
- All API from ownerService; read actual field names from ownerService.ts

**Commits:**
- feat: fees screen with month picker, summary cards, fee records, pay modal

### Agent 8 — Students Screen (2026-06-28)

**What was done:**
- Reviewed Agent 7's batches screen — no issues found. Confirmed: FlatList with `keyExtractor` using `item.id.toString()` (Batch.id is `number`), Create Batch modal with correct fields (name/subject/grade/start_time/end_time/max_capacity), Add Student modal calling `inviteStudent` with `batch_id: number`, pull-to-refresh with RefreshControl, empty state component. `npx tsc --noEmit` passed with zero errors before starting.
- Implemented `src/app/(owner)/students.tsx` (replaced placeholder)
  - Loads all batches with `getBatches()`, then loads enrollments per batch in parallel with `Promise.all(batches.map(b => getEnrollmentsByBatch(b.id)))`, flattens into a single `EnrollmentRow[]`
  - Batch filter chips (horizontal ScrollView): "All Batches" + one chip per batch; uses `number | 'all'` state type to match `Batch.id: number`
  - Search bar (client-side, case-insensitive) filters by `student_name` or falls back to `Student #${student_id}`
  - `EnrollmentRow` card: student name (denormalized from API), batch name, due day with ordinal suffix, first month fee in ₹, fee status chip
  - Fee status color map handles both web-source values (FULLY_PAID/PARTIALLY_PAID/NOT_PAID) and ownerService FeeRecord values (PAID/PARTIAL/PENDING)
  - Remove button → `Alert.alert` confirmation → `removeEnrollment(id: number)`
  - Add Student modal: batch selector chips (horizontal scroll) + student/parent fields; calls `inviteStudent({ batch_id: number, ... })`
  - Pull-to-refresh via `RefreshControl`, empty state with context-aware message (search vs empty)
  - Key type fixes vs spec template: `selectedBatchId: number | null` (not string), `removeEnrollment` receives `number`, `EnrollmentRow` intersection type adds `student_name?/fee_status?` for API-only fields, `keyExtractor` uses `.toString()`
- `npx tsc --noEmit` passes with zero errors after implementation

**Notes for Agent 9 (Fees Screen):**
- Source: `/Users/bedantsharma/PycharmProjects/BatchBook/batchbookui/src/pages/owner/FeesPage.jsx`
- File to replace: `src/app/(owner)/fees.tsx`
- Month picker: no HTML date input in RN — use a simple text display with prev/next arrow buttons to change month (format: YYYY-MM)
- 4 summary cards at top: Total Due, Collected, Pending, Collection Rate — from `getFeeDashboard(month)`
- Per-batch sections (use batch tabs or a batch filter like students screen)
- Per batch: fee structure display + "Generate Records" button + list of fee records
- Each fee record: student name, amount due, amount paid, status chip, "Mark Paid" button + "WhatsApp Reminder" button
- Mark Paid modal: amount_paid field + optional reference — calls `markPayment(recordId, amountPaid, reference)` where all IDs are `number`
- WhatsApp reminder: calls `sendFeeReminder(recordId: number)` (no UI modal needed, just a button)
- Fee setup modal: calls `setupFeeStructure(batchId: number, monthlyAmount: number)` if no fee structure exists
- API functions all from `../../services/ownerService`
- The month controls should default to the current month (new Date() → format YYYY-MM)
- All IDs in ownerService are `number` (Batch.id, Enrollment.id, FeeRecord.id) — do NOT use string IDs
- FeeRecord.status values: `'PENDING' | 'PAID' | 'PARTIAL' | 'NOT_PAID' | 'PARTIALLY_PAID'`

**Commits:**
- feat: students screen with enrollment list, batch filter, search, remove

### Agent 7 — Batches Screen (2026-06-28)

**What was done:**
- Reviewed Agent 6's tab layout and setup screen — no issues found. Confirmed: 5 visible tabs (Batches, Students, Fees, Attendance, Tests) + `setup` hidden via `href: null`, auth guard redirects to `/(auth)/landing` when no session, setup form has `name` + `city` fields POSTing to `/owner/institute` with 409 handled, `npx tsc --noEmit` passed with zero errors before starting.
- Implemented `src/app/(owner)/batches.tsx` (replaced placeholder)
  - FlatList of batch cards; `keyExtractor` uses `item.id.toString()` (Batch.id is `number`)
  - Each card: name, subject/grade row, status badge, timing (formatted from `start_time`/`end_time`), days of week joined with ` · `, capacity progress bar (loads active enrollment count per card via `getEnrollmentsByBatch`), "Add Student" button
  - Status badge colors: ACTIVE=`C.success`, CLOSING=`C.warning`, ARCHIVED=`C.text2`
  - Header: "Batches" title + "+" `Pressable` to open create modal
  - Create Batch Modal (bottom sheet, `animationType="slide"`): name/subject/grade/start_time/end_time/capacity fields; calls `createBatch(Partial<Batch>)`
  - Add Student Modal: student_name/parent_name/parent_phone/due_day/first_month_amount; calls `inviteStudent` with `batch_id: number`
  - Pull-to-refresh via `RefreshControl`, empty state with 📚 emoji and "Tap + to create your first batch"
  - Key adaptation from web source: web uses `timing` string and `enrolled_count` field — RN version formats time from `start_time`/`end_time` and loads enrollment count via separate `getEnrollmentsByBatch` call per card (same pattern as web's `BatchCard` useEffect)
- `npx tsc --noEmit` passes with zero errors after implementation

**Notes for Agent 8 (Students Screen):**
- Source: `/Users/bedantsharma/PycharmProjects/BatchBook/batchbookui/src/pages/owner/StudentsPage.jsx`
- File to replace: `src/app/(owner)/students.tsx`
- Shows a flat list of all enrollments across all batches
- Has a batch filter (Picker/dropdown at top) and search bar
- Each row: student name, batch name, due day, first month fee, fee status chip, remove button
- Fee status chip colors: PAID=C.success, PARTIAL=C.warning, PENDING=C.error
- Remove enrollment calls `removeEnrollment(enrollmentId)` with confirmation
- Search filters by student name (client-side)
- Batch filter: "All Batches" + each batch name; filters enrollment list client-side
- Also has "Add Student" button that opens the same modal pattern as BatchesPage (calls `inviteStudent`)
- API: `getBatches()`, `getEnrollmentsByBatch(batchId)` for each batch (or load all then flatten)
- Import from `../../services/ownerService`

**Commits:**
- feat: batches screen with cards, create batch modal, add student modal

### Agent 6 — Owner Setup + Tab Layout (2026-06-28)

**What was done:**
- Reviewed Agent 5's onboarding wizard — no issues found. Confirmed: 3-step in-screen state machine, step 1 role card auto-advances to step 2, step 2 shows name-only for owner and name+parent name+parent phone for student, saves `onboarding_profile` to AsyncStorage in step 3 handler, owner path ends at `/(auth)/phone-login`, student path shows join-link info then "Done" returns to landing, progress bar (3px flex track) across top. `npx tsc --noEmit` passed with zero errors.
- Installed `@expo/vector-icons` (was missing from project deps)
- Implemented `src/app/(owner)/_layout.tsx` — 5-tab bottom navigator with auth guard
  - Tabs: Batches (layers), Students (people), Fees (attach-money), Attendance (check-circle), Tests (assignment)
  - Active tint: C.primary (#BB86FC), inactive: C.text2, tab bar bg: C.surface (#1E1E1E)
  - `setup` hidden from tab bar via `href: null` (confirmed via Context7 docs)
  - Auth guard: `!loading && !session` → `router.replace('/(auth)/landing')`, returns `<LoadingScreen />` while loading
  - Fixed TypeScript: `color as string` cast in tabBarIcon callbacks (tabBarIcon receives `ColorValue` not plain `string`)
- Implemented `src/app/(owner)/setup.tsx` — institute setup form
  - Fields: name (required) + city (optional as per task spec), POST to `/owner/institute`
  - 409 (already exists) → `router.replace('/(owner)/batches')`
  - Success (201/200) → `router.replace('/(owner)/batches')`
  - Inline error display under name field, button disabled until name is non-empty
- `npx tsc --noEmit` passes with zero errors after all changes

**Notes for Agent 7 (Batches Screen):**
- Source: `/Users/bedantsharma/PycharmProjects/BatchBook/batchbookui/src/pages/owner/BatchesPage.jsx`
- File to replace: `src/app/(owner)/batches.tsx`
- The screen shows a FlatList of batch cards. Each card shows: name, subject, grade, status badge (ACTIVE/CLOSING/ARCHIVED), timing, days of week, enrolled/capacity counts
- Add Student button per card → opens a modal to enroll a student into that batch
- Create Batch button (FAB or header button) → opens a create-batch modal
- API calls:
  - `getBatches()` from `../../services/ownerService` on mount
  - `createBatch(data)` for new batch
  - `inviteStudent(data)` for enrolling student (from StudentsPage but used here too)
- Status badge colors: ACTIVE=C.success, CLOSING=C.warning, ARCHIVED=C.text2
- Use `FlatList` from react-native (not ScrollView) for the list
- Modal: use `Modal` from react-native with a dark overlay
- Batch form fields: name, subject, grade, timing (string), days_of_week (multi-select), capacity (number), status

**Commits:**
- feat: owner tab layout with auth guard and institute setup screen

### Agent 5 — Onboarding Wizard (2026-06-28)

**What was done:**
- Reviewed Agent 4's OTP verification screen — no issues found. Confirmed: `useLocalSearchParams<{ phone: string }>()` to get the phone param; calls `POST /owner/verify_otp` with `{ token: otp, phone }`; sets Supabase session via `supabase.auth.setSession({ access_token: data.auth_token, refresh_token: data.refresh_token })`; stores `bb_role=owner` in AsyncStorage; checks `GET /owner/institute` — 404 → `/(owner)/setup`, 200 → `/(owner)/batches`; 60-second countdown timer with resend; auto-submits when 6 digits filled. `npx tsc --noEmit` passed with zero errors.
- Implemented `src/app/(auth)/onboarding.tsx` — 3-step in-screen wizard
- Step 1: role selection (Tutor / Student) with tappable cards highlighted by `borderColor: C.primary` when selected
- Step 2: profile fields (name only for owner; name + parent name + parent phone for student); phone strips non-digits and caps at 10
- Step 3: owner → "Almost there!" + "Continue to Login →" saves `onboarding_profile` to AsyncStorage then `router.replace('/(auth)/phone-login')`; student → "Ask your tutor" info screen with styled join-link example + "Done" returns to landing
- Progress bar (3px flex-based track) across top; back button navigates between steps
- Fixed TypeScript issues vs template: AppCard `style` prop is `ViewStyle` not `StyleProp<ViewStyle>` — merged active styles with object spread; avoided nested `AppText` for the join-link example (used plain `<Text>` in a styled box instead); fixed `AppText style` usage to avoid array form
- `npx tsc --noEmit` passes with zero errors after implementation

**Notes for Agent 6 (Owner Setup + Owner Tab Layout):**
- Source for setup: `/Users/bedantsharma/PycharmProjects/BatchBook/batchbookui/src/pages/owner/OwnerSetup.jsx`
- Source for shell: `/Users/bedantsharma/PycharmProjects/BatchBook/batchbookui/src/pages/owner/OwnerDashboard.jsx`
- Files to create/replace:
  - `src/app/(owner)/_layout.tsx` — replace the placeholder with real bottom tabs (5 tabs: Batches, Students, Fees, Attendance, Tests) with MaterialIcons from `@expo/vector-icons`
  - `src/app/(owner)/setup.tsx` — replace placeholder with the real setup form
- Setup form: two fields: `name` (institute name) and `city`. Posts to `POST /owner/institute`. On 409 (already exists), navigate to `/(owner)/batches`. On success, also navigate to `/(owner)/batches`.
- Tab layout must use `useAuth()` to guard: if no session → redirect to `/(auth)/landing`
- Tab icons: Batches=layers, Students=people, Fees=attach-money, Attendance=check-circle, Tests=assignment
- Colors: active tab icon = C.primary (#BB86FC), inactive = C.text2

**Commits:**
- feat: onboarding wizard with role selection and profile steps

### Agent 4 — OTP Verification Screen (2026-06-28)

**What was done:**
- Reviewed Agent 3's phone-login screen — no issues found. Confirmed: strips non-digits and caps at 10 chars in `onChangeText` (`t.replace(/\D/g, '').slice(0, 10)`), calls `api.post('/owner/generate_otp', { phone })`, on success navigates to `/(auth)/otp-verification` with `phone` param, uses `KeyboardAvoidingView`. `npx tsc --noEmit` passed with zero errors before starting.
- Implemented `src/app/(auth)/otp-verification.tsx`
- Receives `phone` via `useLocalSearchParams<{ phone: string }>()` (confirmed pattern with Context7 docs)
- 6-digit OTP with auto-submit when all cells filled (calls `verify(val)` in `handleOtpChange`)
- 60-second countdown timer using recursive `setTimeout` (matches source's intent; cleans up on unmount)
- Resend resets countdown to 60 and calls `POST /owner/generate_otp` again
- Calls `POST /owner/verify_otp` with `{ token: otp, phone }`, sets Supabase session via `supabase.auth.setSession()`, stores `bb_role=owner` in AsyncStorage
- Checks `GET /owner/institute`: 404 → `/(owner)/setup`, 200 → `/(owner)/batches`; other errors re-thrown
- Error clears the OTP input so user can re-enter fresh digits
- `npx tsc --noEmit` passes with zero errors after implementation

**Notes for Agent 5 (Onboarding Wizard):**
- Source: `/Users/bedantsharma/PycharmProjects/BatchBook/batchbookui/src/components/onboarding/OnboardingWizard.jsx`
- File to create: `src/app/(auth)/onboarding.tsx`
- Multi-step wizard: step 1 = role selection (owner/student), step 2 = profile details
- For owner role: at end navigate to `/(auth)/phone-login`
- For student role: save `onboarding_profile` to AsyncStorage as JSON, then navigate to student login or wait for join link
- Progress bar (flex-based) across top
- Use `AppButton`, `AppInput`, `AppText` from shared components
- Store: `await AsyncStorage.setItem('onboarding_profile', JSON.stringify(profileData))`
- Read the source carefully for all steps and field names

**Commits:**
- feat: OTP verification with auto-submit, countdown timer, and session setup

---

### Agent 3 — Phone Login Screen (2026-06-28)

**What was done:**
- Reviewed Agent 2's landing screen — no issues found. Confirmed: `SafeAreaView` from `react-native-safe-area-context`, `useRouter` from `expo-router`, both CTA buttons navigate correctly, all colors use `C` tokens, `npx tsc --noEmit` passes with zero errors.
- Implemented `src/app/(auth)/phone-login.tsx`
- 10-digit Indian phone validation (`/^\d{10}$/`); strips non-digits and caps at 10 chars in `onChangeText`
- Calls `POST /owner/generate_otp` via the shared `api` axios instance
- On success navigates to `/(auth)/otp-verification` with `phone` as a query param via `router.push({ pathname, params })`
- `KeyboardAvoidingView` wrapping the form for iOS (`padding`) / Android (`height`) keyboard handling
- Back button using `router.back()`, loading state on submit button, inline error below the input
- `autoFocus` on the phone input for immediate keyboard presentation
- Queried Context7 docs (expo-router, `/websites/expo_dev`) — confirmed `router.push({ pathname, params })` and `useLocalSearchParams` API for Expo SDK 56 / expo-router

**Notes for Agent 4 (OTP Verification):**
- Source: `/Users/bedantsharma/PycharmProjects/BatchBook/batchbookui/src/components/OtpVerification.jsx`
- Receives `phone` as a query param — use `useLocalSearchParams()` from `expo-router` to get it
- Calls `POST /owner/verify_otp` with `{ token: otp, phone }`
- Response has `{ auth_token, refresh_token }` → call `supabase.auth.setSession({ access_token: auth_token, refresh_token })`
- After session set: `await AsyncStorage.setItem('bb_role', 'owner')`
- Then check `/owner/institute` — if 404 navigate to `/(owner)/setup`, else navigate to `/(owner)/batches`
- Has a 60-second resend timer (counts down, then enables "Resend OTP" button)
- Use `OtpInput` component from `../../components/OtpInput` (6 cells, auto-focus)
- Import `supabase` from `../../lib/supabaseClient`
- Import `AsyncStorage` from `@react-native-async-storage/async-storage`

**Commits:**
- feat: phone login screen with OTP request and 10-digit validation

---

### Agent 2 — Landing Screen (2026-06-28)

**What was done:**
- Reviewed Agent 1's foundation code — no issues found. All key files verified: `colors.ts` exports `default C` and named `radius`; `supabaseClient.ts` uses `AsyncStorage` adapter; `AuthContext.tsx` exports `useAuth` and `AuthProvider`; `api.ts` uses `process.env.EXPO_PUBLIC_API_BASE_URL`; all 8 shared components exist; `_layout.tsx` wraps with `AuthProvider` + `ToastProvider` + DM Sans fonts; `index.tsx` redirects based on `bb_role` from AsyncStorage.
- Implemented `src/app/(auth)/landing.tsx` — full landing screen replacing the placeholder
  - Hero section: LogoMark (64px) + "BatchBook" title + tagline
  - 4 feature cards (Batch Management, Fee Tracking, Attendance, Test Scores) using `AppCard`
  - Two CTA buttons: "I'm a Tutor →" → `/(auth)/phone-login`, "I'm a Student" → `/(auth)/onboarding`
  - Privacy policy footer text
  - `SafeAreaView` + `ScrollView` for safe rendering on all screen sizes
  - All colors from `C` (`src/constants/colors.ts`)
- Queried Context7 docs for expo-router v56 — confirmed `useRouter` + `router.push` API is correct
- `npx tsc --noEmit` passes with zero errors

**Notes for Agent 3 (Phone Login screen):**
- Source: `/Users/bedantsharma/PycharmProjects/BatchBook/batchbookui/src/components/PhoneLogin.jsx`
- Calls `POST /owner/generate_otp` with `{ phone }` via the `api` service
- On success: navigate to `/(auth)/otp-verification` passing `phoneNumber` as a param
- Validates 10-digit Indian phone number (digits only, length 10)
- Use `AppInput` for phone field, `AppButton` for submit
- Import `api` from `../../services/api`

**Commits:**
- feat: landing screen with hero, features, and CTA buttons

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
