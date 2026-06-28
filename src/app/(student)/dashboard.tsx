import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { LoadingScreen } from '../../components/LoadingScreen';
import C, { radius } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import {
  getStudentProfile,
  getAttendance,
  getTodaySchedule,
  getUpcomingEvents,
  getFeeStatus,
} from '../../services/dashboardService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentProfile {
  id: number;
  name: string;
  initials: string;
  phone: string;
  institute: string;
  enrolledYear: string;
  batch: string;
  subjects: string[];
  feeDue: boolean;
  paymentLink: string | null;
  avatarUrl: null;
}

interface AttendanceData {
  present: number;
  total: number;
  streak: number;
  month: string;
  items: {
    batch_name: string;
    subject: string;
    present: number;
    total: number;
  }[];
}

interface ScheduleItem {
  id: unknown;
  subject: string;
  batchName: string;
  time: string;
  topic: string;
  attendanceStatus: string;
}

interface UpcomingEvent {
  id: unknown;
  type: string;
  label: string;
  day: string;
  time: string;
  sub: string;
}

interface FeeRecord {
  batch_name?: string;
  amount_due?: number;
  amount_paid?: number;
  status?: string;
  payment_link?: string | null;
}

// ─── Tab definition ───────────────────────────────────────────────────────────

const TABS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'schedule', label: 'Schedule', icon: 'calendar-today' },
  { key: 'fees', label: 'Fees', icon: 'account-balance-wallet' },
  { key: 'profile', label: 'Profile', icon: 'person' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// ─── Month picker helpers ─────────────────────────────────────────────────────

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
}

function prevMonth(ym: string): string {
  const [year, month] = ym.split('-').map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function nextMonth(ym: string): string {
  const [year, month] = ym.split('-').map(Number);
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Fee status helpers ───────────────────────────────────────────────────────

function feeStatusColor(status: string | undefined): string {
  if (!status) return C.text2;
  if (status === 'FULLY_PAID' || status === 'PAID') return C.success;
  if (status === 'PARTIALLY_PAID' || status === 'PARTIAL') return C.warning;
  return C.error;
}

function feeStatusLabel(status: string | undefined): string {
  if (!status) return 'Unknown';
  if (status === 'FULLY_PAID' || status === 'PAID') return 'Paid';
  if (status === 'PARTIALLY_PAID' || status === 'PARTIAL') return 'Partial';
  return 'Unpaid';
}

// ─── Custom bottom tab bar ────────────────────────────────────────────────────

function BottomTabBar({
  activeTab,
  onTabChange,
  bottomInset,
}: {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  bottomInset: number;
}) {
  return (
    <View style={[styles.tabBar, { paddingBottom: bottomInset + 8 }]}>
      {TABS.map(tab => {
        const active = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            style={styles.tabItem}
            hitSlop={4}
          >
            <MaterialIcons
              name={tab.icon as React.ComponentProps<typeof MaterialIcons>['name']}
              size={24}
              color={active ? C.primary : C.text2}
            />
            <AppText
              size={10}
              weight={active ? '600' : '400'}
              color={active ? C.primary : C.text2}
              style={{ marginTop: 3 }}
            >
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Home tab ────────────────────────────────────────────────────────────────

function HomeTab({
  profile,
  attendance,
  schedule,
  upcomingEvents,
  loading,
  error,
}: {
  profile: StudentProfile | null;
  attendance: AttendanceData | null;
  schedule: ScheduleItem[];
  upcomingEvents: UpcomingEvent[];
  loading: boolean;
  error: string;
}) {
  if (loading) {
    return (
      <View style={styles.centeredLoader}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredLoader}>
        <AppText size={16} color={C.error} style={{ marginBottom: 8, textAlign: 'center' }}>
          Could not load dashboard
        </AppText>
        <AppText size={13} color={C.text2} style={{ textAlign: 'center' }}>
          {error}
        </AppText>
      </View>
    );
  }

  const attendancePct =
    attendance && attendance.total > 0
      ? Math.round((attendance.present / attendance.total) * 100)
      : 0;
  const pctColor = attendancePct >= 75 ? C.success : C.error;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <View style={{ marginBottom: 20 }}>
        <AppText size={22} weight="700">
          Hello, {profile?.name ?? 'Student'} 👋
        </AppText>
        <AppText size={13} color={C.text2} style={{ marginTop: 4 }}>
          {attendance?.month ?? ''}
        </AppText>
      </View>

      {/* Fee Due Banner */}
      {profile?.feeDue ? (
        <View style={styles.feeBanner}>
          <View style={{ flex: 1 }}>
            <AppText size={14} weight="600" color={C.error}>
              Fee Due
            </AppText>
            <AppText size={12} color={C.text2} style={{ marginTop: 2 }}>
              You have an outstanding fee for this month.
            </AppText>
          </View>
          {profile.paymentLink ? (
            <AppText size={12} color={C.error} weight="600">
              Pay Now
            </AppText>
          ) : (
            <AppText size={12} color={C.text2}>
              Contact institute
            </AppText>
          )}
        </View>
      ) : null}

      {/* Attendance Summary Card */}
      <AppCard style={styles.summaryCard}>
        <AppText size={11} color={C.text2} weight="600" style={styles.sectionLabel}>
          ATTENDANCE THIS MONTH
        </AppText>
        <AppText size={40} weight="800" color={pctColor}>
          {attendancePct}%
        </AppText>
        <AppText size={13} color={C.text2} style={{ marginTop: 4 }}>
          {attendance?.present ?? 0} present out of {attendance?.total ?? 0} sessions
        </AppText>
      </AppCard>

      {/* Today's Classes */}
      <View style={{ marginBottom: 20 }}>
        <AppText size={15} weight="700" style={{ marginBottom: 12 }}>
          Today's classes
        </AppText>
        {schedule.length === 0 ? (
          <AppText size={13} color={C.text2}>
            No classes scheduled today.
          </AppText>
        ) : (
          schedule.map((s, idx) => (
            <AppCard key={String(s.id ?? idx)} style={styles.sessionCard}>
              <View style={{ flex: 1 }}>
                <AppText size={14} weight="600">
                  {s.subject}
                </AppText>
                <AppText size={12} color={C.text2} style={{ marginTop: 2 }}>
                  {s.batchName}
                  {s.topic ? ` · ${s.topic}` : ''}
                </AppText>
              </View>
              <AppText size={12} color={C.text2}>
                {s.time}
              </AppText>
            </AppCard>
          ))
        )}
      </View>

      {/* Upcoming Events */}
      <View style={{ marginBottom: 20 }}>
        <AppText size={15} weight="700" style={{ marginBottom: 12 }}>
          Upcoming
        </AppText>
        {upcomingEvents.length === 0 ? (
          <AppText size={13} color={C.text2}>
            No upcoming classes found.
          </AppText>
        ) : (
          upcomingEvents.slice(0, 5).map((e, idx) => (
            <AppCard key={String(e.id ?? idx)} style={styles.sessionCard}>
              <View style={{ flex: 1 }}>
                <AppText size={14} weight="600">
                  {e.label}
                </AppText>
                <AppText size={12} color={C.text2} style={{ marginTop: 2 }}>
                  {e.sub}
                </AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText size={12} color={C.primary} weight="600">
                  {e.day}
                </AppText>
                <AppText size={11} color={C.text2}>
                  {e.time}
                </AppText>
              </View>
            </AppCard>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ─── Schedule (Attendance) tab ────────────────────────────────────────────────

function ScheduleTab({
  schedule,
  upcomingEvents,
  attendanceMonth,
  setAttendanceMonth,
  attendance,
  attendanceLoading,
  onRefreshAttendance,
}: {
  schedule: ScheduleItem[];
  upcomingEvents: UpcomingEvent[];
  attendanceMonth: string;
  setAttendanceMonth: (m: string) => void;
  attendance: AttendanceData | null;
  attendanceLoading: boolean;
  onRefreshAttendance: (month: string) => void;
}) {
  const attendancePct =
    attendance && attendance.total > 0
      ? Math.round((attendance.present / attendance.total) * 100)
      : 0;
  const pctColor = attendancePct >= 75 ? C.success : C.error;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
    >
      <AppText size={20} weight="700" style={{ marginBottom: 16 }}>
        Schedule & Attendance
      </AppText>

      {/* Month picker */}
      <View style={styles.monthPicker}>
        <Pressable onPress={() => {
          const m = prevMonth(attendanceMonth);
          setAttendanceMonth(m);
          onRefreshAttendance(m);
        }} hitSlop={8}>
          <MaterialIcons name="chevron-left" size={24} color={C.text} />
        </Pressable>
        <AppText size={14} weight="600">
          {formatMonthLabel(attendanceMonth)}
        </AppText>
        <Pressable onPress={() => {
          const m = nextMonth(attendanceMonth);
          setAttendanceMonth(m);
          onRefreshAttendance(m);
        }} hitSlop={8}>
          <MaterialIcons name="chevron-right" size={24} color={C.text} />
        </Pressable>
      </View>

      {/* Attendance summary */}
      {attendanceLoading ? (
        <ActivityIndicator color={C.primary} style={{ marginVertical: 24 }} />
      ) : (
        <AppCard style={styles.summaryCard}>
          <AppText size={11} color={C.text2} weight="600" style={styles.sectionLabel}>
            ATTENDANCE — {formatMonthLabel(attendanceMonth).toUpperCase()}
          </AppText>
          <AppText size={40} weight="800" color={pctColor}>
            {attendancePct}%
          </AppText>
          <AppText size={13} color={C.text2} style={{ marginTop: 4 }}>
            {attendance?.present ?? 0} present · {attendance?.total ?? 0} sessions
          </AppText>

          {/* Per-batch attendance breakdown */}
          {attendance && attendance.items.length > 0 ? (
            <View style={{ marginTop: 16, gap: 8 }}>
              {attendance.items.map((item, idx) => {
                const batchPct =
                  item.total > 0 ? Math.round((item.present / item.total) * 100) : 0;
                const bColor = batchPct >= 75 ? C.success : C.error;
                return (
                  <View key={idx} style={styles.batchRow}>
                    <View style={{ flex: 1 }}>
                      <AppText size={13} weight="600">
                        {item.batch_name}
                      </AppText>
                      <AppText size={11} color={C.text2}>
                        {item.subject}
                      </AppText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <AppText size={14} weight="700" color={bColor}>
                        {batchPct}%
                      </AppText>
                      <AppText size={11} color={C.text2}>
                        {item.present}/{item.total}
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </AppCard>
      )}

      {/* Today's schedule */}
      <View style={{ marginBottom: 20 }}>
        <AppText size={15} weight="700" style={{ marginBottom: 12 }}>
          Today
        </AppText>
        {schedule.length === 0 ? (
          <AppText size={13} color={C.text2}>
            No classes today.
          </AppText>
        ) : (
          schedule.map((s, idx) => (
            <AppCard key={String(s.id ?? idx)} style={styles.sessionCard}>
              <View style={{ flex: 1 }}>
                <AppText size={14} weight="600">
                  {s.subject}
                </AppText>
                <AppText size={12} color={C.text2} style={{ marginTop: 2 }}>
                  {s.batchName}
                  {s.topic ? ` · ${s.topic}` : ''}
                </AppText>
              </View>
              <AppText size={12} color={C.text2}>
                {s.time}
              </AppText>
            </AppCard>
          ))
        )}
      </View>

      {/* Upcoming */}
      <View style={{ marginBottom: 20 }}>
        <AppText size={15} weight="700" style={{ marginBottom: 12 }}>
          Upcoming
        </AppText>
        {upcomingEvents.length === 0 ? (
          <AppText size={13} color={C.text2}>
            No upcoming classes.
          </AppText>
        ) : (
          upcomingEvents.map((e, idx) => (
            <AppCard key={String(e.id ?? idx)} style={styles.sessionCard}>
              <View style={{ flex: 1 }}>
                <AppText size={14} weight="600">
                  {e.label}
                </AppText>
                <AppText size={12} color={C.text2} style={{ marginTop: 2 }}>
                  {e.sub}
                </AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText size={12} color={C.primary} weight="600">
                  {e.day}
                </AppText>
                <AppText size={11} color={C.text2}>
                  {e.time}
                </AppText>
              </View>
            </AppCard>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ─── Fees tab ─────────────────────────────────────────────────────────────────

function FeesTab({
  feeRecords,
  feeMonth,
  setFeeMonth,
  feeLoading,
  onRefreshFees,
}: {
  feeRecords: FeeRecord[];
  feeMonth: string;
  setFeeMonth: (m: string) => void;
  feeLoading: boolean;
  onRefreshFees: (month: string) => void;
}) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
    >
      <AppText size={20} weight="700" style={{ marginBottom: 16 }}>
        Fee Status
      </AppText>

      {/* Month picker */}
      <View style={styles.monthPicker}>
        <Pressable onPress={() => {
          const m = prevMonth(feeMonth);
          setFeeMonth(m);
          onRefreshFees(m);
        }} hitSlop={8}>
          <MaterialIcons name="chevron-left" size={24} color={C.text} />
        </Pressable>
        <AppText size={14} weight="600">
          {formatMonthLabel(feeMonth)}
        </AppText>
        <Pressable onPress={() => {
          const m = nextMonth(feeMonth);
          setFeeMonth(m);
          onRefreshFees(m);
        }} hitSlop={8}>
          <MaterialIcons name="chevron-right" size={24} color={C.text} />
        </Pressable>
      </View>

      {feeLoading ? (
        <ActivityIndicator color={C.primary} style={{ marginVertical: 24 }} />
      ) : feeRecords.length === 0 ? (
        <AppText size={13} color={C.text2} style={{ marginTop: 16 }}>
          No fee records found for this month.
        </AppText>
      ) : (
        <View style={{ gap: 12 }}>
          {feeRecords.map((record, idx) => {
            const statusColor = feeStatusColor(record.status);
            const statusText = feeStatusLabel(record.status);
            const isUnpaid =
              record.status === 'NOT_PAID' ||
              record.status === 'PENDING' ||
              record.status === 'PARTIALLY_PAID' ||
              record.status === 'PARTIAL';

            return (
              <AppCard key={idx} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <AppText size={15} weight="600">
                      {record.batch_name ?? 'Fee Record'}
                    </AppText>
                    <AppText size={12} color={C.text2} style={{ marginTop: 3 }}>
                      Due: ₹{record.amount_due ?? 0}
                    </AppText>
                    {(record.amount_paid ?? 0) > 0 ? (
                      <AppText size={12} color={C.text2}>
                        Paid: ₹{record.amount_paid}
                      </AppText>
                    ) : null}
                  </View>
                  {/* Status chip */}
                  <View
                    style={[
                      styles.statusChip,
                      { backgroundColor: statusColor + '22' },
                    ]}
                  >
                    <AppText size={12} weight="700" color={statusColor}>
                      {statusText}
                    </AppText>
                  </View>
                </View>

                {isUnpaid ? (
                  <AppText size={12} color={C.text2}>
                    {record.payment_link
                      ? 'Payment link available — contact your institute.'
                      : 'Contact your institute to pay.'}
                  </AppText>
                ) : null}
              </AppCard>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Profile tab ──────────────────────────────────────────────────────────────

function ProfileTab({
  profile,
  loading,
  onSignOut,
}: {
  profile: StudentProfile | null;
  loading: boolean;
  onSignOut: () => void;
}) {
  if (loading) {
    return (
      <View style={styles.centeredLoader}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
    >
      <AppText size={20} weight="700" style={{ marginBottom: 20 }}>
        Profile
      </AppText>

      {/* Avatar + Name */}
      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <AppText size={22} weight="700" color={C.bg}>
            {profile?.initials ?? '?'}
          </AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText size={18} weight="700">
            {profile?.name ?? 'Student'}
          </AppText>
          {profile?.batch ? (
            <AppText size={13} color={C.text2} style={{ marginTop: 2 }}>
              {profile.batch}
            </AppText>
          ) : null}
        </View>
      </View>

      {/* Info cards */}
      <AppCard style={{ gap: 14, marginBottom: 12 }}>
        {profile?.phone ? (
          <View style={styles.infoRow}>
            <MaterialIcons name="phone" size={18} color={C.text2} />
            <AppText size={14} color={C.text2}>
              {profile.phone}
            </AppText>
          </View>
        ) : null}

        {profile?.subjects && profile.subjects.length > 0 ? (
          <View style={styles.infoRow}>
            <MaterialIcons name="school" size={18} color={C.text2} />
            <AppText size={14} color={C.text2}>
              {profile.subjects.join(', ')}
            </AppText>
          </View>
        ) : null}

        {profile?.enrolledYear ? (
          <View style={styles.infoRow}>
            <MaterialIcons name="calendar-today" size={18} color={C.text2} />
            <AppText size={14} color={C.text2}>
              Enrolled {profile.enrolledYear}
            </AppText>
          </View>
        ) : null}
      </AppCard>

      {/* Sign Out */}
      <AppButton
        label="Sign Out"
        onPress={onSignOut}
        variant="secondary"
        style={{ marginTop: 8 }}
      />
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { session, role, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabKey>('home');

  // ── Core data state ────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // ── Per-tab month pickers ──────────────────────────────────────────────────
  const [attendanceMonth, setAttendanceMonth] = useState(currentMonth);
  const [feeMonth, setFeeMonth] = useState(currentMonth);

  // ── Per-tab loading flags ─────────────────────────────────────────────────
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [feeLoading, setFeeLoading] = useState(false);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace('/(auth)/landing' as never);
      return;
    }
    if (role && role !== 'student') {
      router.replace('/(auth)/onboarding' as never);
    }
  }, [authLoading, session, role, router]);

  // ── Load all data on mount ─────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setError('');
    try {
      const [p, a, s, u, f] = await Promise.all([
        getStudentProfile(),
        getAttendance(attendanceMonth),
        getTodaySchedule(),
        getUpcomingEvents(5),
        getFeeStatus(feeMonth),
      ]);
      setProfile(p as StudentProfile);
      setAttendance(a);
      setSchedule(s as ScheduleItem[]);
      setUpcomingEvents(u as UpcomingEvent[]);
      setFeeRecords((f as FeeRecord[]) ?? []);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message ?? 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authLoading && session) {
      loadAll();
    }
  }, [authLoading, session, loadAll]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const [p, a, s, u, f] = await Promise.all([
        getStudentProfile(),
        getAttendance(attendanceMonth),
        getTodaySchedule(),
        getUpcomingEvents(5),
        getFeeStatus(feeMonth),
      ]);
      setProfile(p as StudentProfile);
      setAttendance(a);
      setSchedule(s as ScheduleItem[]);
      setUpcomingEvents(u as UpcomingEvent[]);
      setFeeRecords((f as FeeRecord[]) ?? []);
      setError('');
    } catch {
      // ignore — keep stale data
    } finally {
      setRefreshing(false);
    }
  };

  // ── Attendance month change ────────────────────────────────────────────────
  const handleAttendanceMonthChange = useCallback(async (month: string) => {
    setAttendanceLoading(true);
    try {
      const a = await getAttendance(month);
      setAttendance(a);
    } catch {
      // keep stale
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  // ── Fee month change ──────────────────────────────────────────────────────
  const handleFeeMonthChange = useCallback(async (month: string) => {
    setFeeLoading(true);
    try {
      const f = await getFeeStatus(month);
      setFeeRecords((f as FeeRecord[]) ?? []);
    } catch {
      // keep stale
    } finally {
      setFeeLoading(false);
    }
  }, []);

  // ── Sign out ───────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/landing' as never);
  };

  // ── Loading + auth guard splash ────────────────────────────────────────────
  if (authLoading) return <LoadingScreen />;
  if (!session) return <LoadingScreen />;

  const TAB_BAR_HEIGHT = 64 + insets.bottom;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Screen header */}
      <View style={styles.screenHeader}>
        <AppText size={16} weight="700">
          BatchBook
        </AppText>
        <AppText size={11} color={C.text2}>
          Student
        </AppText>
      </View>

      {/* Tab content */}
      <View style={[styles.contentArea, { paddingBottom: TAB_BAR_HEIGHT }]}>
        {activeTab === 'home' && (
          <HomeTab
            profile={profile}
            attendance={attendance}
            schedule={schedule}
            upcomingEvents={upcomingEvents}
            loading={loading}
            error={error}
          />
        )}
        {activeTab === 'schedule' && (
          <ScheduleTab
            schedule={schedule}
            upcomingEvents={upcomingEvents}
            attendanceMonth={attendanceMonth}
            setAttendanceMonth={setAttendanceMonth}
            attendance={attendance}
            attendanceLoading={attendanceLoading}
            onRefreshAttendance={handleAttendanceMonthChange}
          />
        )}
        {activeTab === 'fees' && (
          <FeesTab
            feeRecords={feeRecords}
            feeMonth={feeMonth}
            setFeeMonth={setFeeMonth}
            feeLoading={feeLoading}
            onRefreshFees={handleFeeMonthChange}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileTab profile={profile} loading={loading} onSignOut={handleSignOut} />
        )}
      </View>

      {/* Bottom tab bar */}
      <BottomTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        bottomInset={insets.bottom}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.outline,
    backgroundColor: C.bg,
  },

  contentArea: {
    flex: 1,
  },

  tabContent: {
    padding: 20,
    paddingBottom: 32,
  },

  // ── Bottom tab bar ─────────────────────────────────────────────────────────
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.outline,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },

  // ── Month picker ───────────────────────────────────────────────────────────
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },

  // ── Cards ──────────────────────────────────────────────────────────────────
  summaryCard: {
    marginBottom: 24,
    gap: 4,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  batchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.outline,
  },

  // ── Fee status chip ────────────────────────────────────────────────────────
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.lg,
    marginLeft: 10,
  },

  // ── Profile ────────────────────────────────────────────────────────────────
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // ── Fee due banner ─────────────────────────────────────────────────────────
  feeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.error + '1E',
    borderWidth: 1,
    borderColor: C.error + '4D',
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 16,
  },

  // ── Loading ────────────────────────────────────────────────────────────────
  sectionLabel: {
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  centeredLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
