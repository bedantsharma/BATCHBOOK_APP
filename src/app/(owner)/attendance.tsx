import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { FilterChip } from '../../components/FilterChip';
import { StatusChip } from '../../components/StatusChip';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { Touchable } from '../../components/Touchable';
import { SkeletonList } from '../../components/Skeleton';
import { DateTimeField } from '../../components/DateTimeField';
import C, { radius } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { toastEmitter } from '../../lib/toastEmitter';
import { haptics } from '../../lib/haptics';
import {
  getBatches,
  getEnrollmentsByBatch,
  getBatchSessions,
  getSessionAttendance,
  createSession,
  markAttendance,
  type Batch,
  type Enrollment,
} from '../../services/ownerService';

// ─── Local types ──────────────────────────────────────────────────────────────

interface Session {
  id: number;
  date: string;
  start_time?: string;
  end_time?: string;
  topic?: string | null;
}

interface AttendanceRow {
  enrollment_id: number;
  status: 'PRESENT' | 'ABSENT';
}

type EnrollmentRow = Enrollment & { student_name?: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** Ensures HH:MM becomes HH:MM:00; leaves HH:MM:SS unchanged */
function appendSeconds(t: string): string {
  return /^\d{1,2}:\d{2}:\d{2}$/.test(t) ? t : `${t}:00`;
}

// ─── AttendanceSheet (inline inside expanded session card) ────────────────────

interface AttendanceSheetProps {
  sessionId: number;
  enrollments: EnrollmentRow[];
  attendance: AttendanceRow[];
  onSaved: (rows: AttendanceRow[]) => void;
}

function AttendanceSheet({ sessionId, enrollments, attendance, onSaved }: AttendanceSheetProps) {
  // Seed present IDs from already-stored attendance rows
  const [presentIds, setPresentIds] = useState<Set<number>>(
    () =>
      new Set(
        attendance.filter(r => r.status === 'PRESENT').map(r => r.enrollment_id)
      )
  );
  const [saving, setSaving] = useState(false);

  function toggle(enrollmentId: number) {
    haptics.toggle();
    setPresentIds(prev => {
      const next = new Set(prev);
      if (next.has(enrollmentId)) {
        next.delete(enrollmentId);
      } else {
        next.add(enrollmentId);
      }
      return next;
    });
  }

  function markAllPresent() {
    setPresentIds(new Set(enrollments.map(e => e.id)));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const rows = (await markAttendance(sessionId, [...presentIds])) as AttendanceRow[];
      toastEmitter.emit(
        `Attendance saved! ${presentIds.size} present, ${enrollments.length - presentIds.size} absent.`,
        'success'
      );
      onSaved(Array.isArray(rows) ? rows : []);
    } catch {
      Alert.alert('Error', 'Failed to save attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const presentCount = presentIds.size;
  const absentCount = enrollments.length - presentCount;

  return (
    <View style={styles.sheetContainer}>
      {/* Summary row + Mark All shortcut */}
      <View style={styles.sheetHeader}>
        <View style={styles.countRow}>
          <StatusChip label={`${presentCount} Present`} color={C.success} variant="caption" />
          <StatusChip label={`${absentCount} Absent`} color={C.error} variant="caption" />
        </View>
        <Touchable haptic onPress={markAllPresent} hitSlop={8} accessibilityRole="button">
          <AppText variant="caption" color={C.primary} weight="600">
            Mark All Present
          </AppText>
        </Touchable>
      </View>

      <View style={styles.sheetDivider} />

      {/* Student rows — one per enrollment */}
      {enrollments.length === 0 ? (
        <AppText
          variant="body"
          color={C.text3}
          style={{ textAlign: 'center', paddingVertical: spacing.lg }}
        >
          No active enrollments in this batch.
        </AppText>
      ) : (
        <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
          {enrollments.map(enrollment => {
            const isPresent = presentIds.has(enrollment.id);
            return (
              <Touchable
                key={enrollment.id}
                onPress={() => toggle(enrollment.id)}
                accessibilityRole="button"
                accessibilityLabel={`${enrollment.student_name ?? `Student ${enrollment.student_id}`}, ${isPresent ? 'present' : 'absent'}`}
                style={[
                  styles.studentRow,
                  {
                    backgroundColor: isPresent
                      ? 'rgba(76,175,80,0.08)'
                      : 'rgba(207,102,121,0.06)',
                    borderColor: isPresent
                      ? 'rgba(76,175,80,0.25)'
                      : 'rgba(207,102,121,0.20)',
                  },
                ]}
              >
                <AppText variant="body" style={{ flex: 1 }}>
                  {enrollment.student_name ?? `Student #${enrollment.student_id}`}
                </AppText>
                <View style={styles.studentStatus}>
                  <MaterialIcons
                    name={isPresent ? 'check-box' : 'check-box-outline-blank'}
                    size={20}
                    color={isPresent ? C.success : C.error}
                  />
                  <AppText
                    variant="caption"
                    weight="600"
                    color={isPresent ? C.success : C.error}
                    style={{ minWidth: 52 }}
                  >
                    {isPresent ? 'PRESENT' : 'ABSENT'}
                  </AppText>
                </View>
              </Touchable>
            );
          })}
        </View>
      )}

      <AppButton
        label="Save Attendance"
        onPress={handleSave}
        loading={saving}
        disabled={enrollments.length === 0}
      />
    </View>
  );
}

// ─── SessionCard ──────────────────────────────────────────────────────────────

interface SessionCardProps {
  session: Session;
  enrollments: EnrollmentRow[];
}

function SessionCard({ session, enrollments }: SessionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceRow[] | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  async function handleExpand() {
    // Only fetch once per session
    if (!expanded && attendance === null) {
      setLoadingAttendance(true);
      try {
        const rows = (await getSessionAttendance(session.id)) as AttendanceRow[];
        setAttendance(Array.isArray(rows) ? rows : []);
      } catch {
        setAttendance([]);
      } finally {
        setLoadingAttendance(false);
      }
    }
    setExpanded(v => !v);
  }

  const presentCount =
    attendance !== null
      ? attendance.filter(r => r.status === 'PRESENT').length
      : null;
  const totalCount = attendance !== null ? attendance.length : null;

  return (
    <AppCard style={styles.sessionCard}>
      {/* Tappable header: date, topic, summary chip, expand icon */}
      <Touchable onPress={handleExpand} style={styles.sessionHeader} accessibilityRole="button">
        <View style={{ flex: 1 }}>
          <AppText variant="body" weight="600">
            {formatDate(session.date)}
          </AppText>
          {session.topic ? (
            <AppText variant="caption" color={C.text2} style={{ marginTop: 2 }}>
              {session.topic}
            </AppText>
          ) : null}
        </View>
        <View style={styles.sessionRight}>
          {attendance !== null &&
          presentCount !== null &&
          totalCount !== null ? (
            <StatusChip
              label={`${presentCount}/${totalCount} present`}
              color={presentCount === totalCount ? C.success : C.warning}
            />
          ) : null}
          {loadingAttendance ? (
            <ActivityIndicator size="small" color={C.text2} />
          ) : (
            <MaterialIcons
              name={expanded ? 'expand-less' : 'expand-more'}
              size={22}
              color={C.text2}
            />
          )}
        </View>
      </Touchable>

      {/* Inline attendance sheet when expanded */}
      {expanded && !loadingAttendance && attendance !== null ? (
        <Animated.View
          entering={FadeInDown.duration(220).springify().damping(18)}
          exiting={FadeOut.duration(140)}
          style={{ marginTop: spacing.md }}
        >
          <View style={styles.sheetDivider} />
          <AttendanceSheet
            sessionId={session.id}
            enrollments={enrollments}
            attendance={attendance}
            onSaved={rows => setAttendance(rows)}
          />
        </Animated.View>
      ) : null}
    </AppCard>
  );
}

// ─── Create Session Modal ─────────────────────────────────────────────────────

interface CreateSessionModalProps {
  visible: boolean;
  batchId: number | null;
  batchName?: string;
  onClose: () => void;
  onCreated: () => void;
}

function CreateSessionModal({
  visible,
  batchId,
  batchName,
  onClose,
  onCreated,
}: CreateSessionModalProps) {
  const [date, setDate] = useState(todayISO());
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('17:00');
  const [topic, setTopic] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setDate(todayISO());
    setStartTime('16:00');
    setEndTime('17:00');
    setTopic('');
    setError('');
  }

  async function handleCreate() {
    if (batchId === null) return;
    if (!date.trim()) {
      setError('Please pick a date.');
      return;
    }
    setError('');
    setCreating(true);
    try {
      await createSession({
        batch_id: batchId,
        date: date.trim(),
        start_time: appendSeconds(startTime.trim()),
        end_time: appendSeconds(endTime.trim()),
        topic: topic.trim() || undefined,
      });
      reset();
      haptics.success();
      toastEmitter.emit('Session created', 'success');
      onCreated();
      onClose();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axErr?.response?.data?.detail ??
          'Failed to create session. It may already exist for this date.'
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      <AppText variant="heading" style={{ marginBottom: spacing.xs }}>
        New Session
      </AppText>
      {batchName ? (
        <AppText
          variant="caption"
          color={C.text2}
          style={{ marginBottom: spacing.xl }}
        >
          {batchName}
        </AppText>
      ) : null}

      <View style={{ gap: spacing.lg }}>
        <DateTimeField label="Date *" mode="date" value={date} onChange={setDate} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <DateTimeField label="Start Time" mode="time" value={startTime} onChange={setStartTime} />
          </View>
          <View style={{ flex: 1 }}>
            <DateTimeField label="End Time" mode="time" value={endTime} onChange={setEndTime} />
          </View>
        </View>
        <AppInput
          label="Topic (optional)"
          placeholder="e.g. Quadratic Equations"
          value={topic}
          onChangeText={setTopic}
        />
      </View>

      {error ? (
        <AppText variant="caption" color={C.error} style={{ marginTop: spacing.sm }}>
          {error}
        </AppText>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
        <AppButton
          label="Cancel"
          onPress={() => {
            reset();
            onClose();
          }}
          variant="secondary"
          style={{ flex: 1 }}
        />
        <AppButton
          label="Create"
          onPress={handleCreate}
          loading={creating}
          disabled={!date.trim()}
          style={{ flex: 1 }}
        />
      </View>
    </BottomSheetModal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AttendanceScreen() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);

  const selectedBatch = batches.find(b => b.id === selectedBatchId);

  // ── Load batches on mount ─────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const data = await getBatches();
        const list = Array.isArray(data) ? data : [];
        setBatches(list);
        if (list.length > 0) setSelectedBatchId(list[0].id);
      } catch {
        // silently ignore — user sees empty state
      }
    })();
  }, []);

  // ── Load enrollments + sessions when selected batch changes ───────────────

  const loadBatchData = useCallback(async (batchId: number) => {
    setLoading(true);
    try {
      const [enrlData, sessData] = await Promise.all([
        getEnrollmentsByBatch(batchId),
        getBatchSessions(batchId),
      ]);
      // Only active enrollments in the attendance sheet
      setEnrollments(
        (enrlData as EnrollmentRow[]).filter(e => e.is_active !== false)
      );
      // Sort newest session first
      setSessions(
        (sessData as Session[]).sort((a, b) => b.date.localeCompare(a.date))
      );
    } catch {
      setEnrollments([]);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBatchId !== null) loadBatchData(selectedBatchId);
  }, [selectedBatchId, loadBatchData]);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────

  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedBatchId !== null) await loadBatchData(selectedBatchId);
    setRefreshing(false);
  };

  // ── FlatList header ───────────────────────────────────────────────────────

  const listHeader = (
    <View>
      {/* Batch chips — same pattern as fees/students screens */}
      {batches.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          {batches.map(b => (
            <FilterChip
              key={b.id}
              label={b.name}
              active={selectedBatchId === b.id}
              onPress={() => setSelectedBatchId(b.id)}
            />
          ))}
        </ScrollView>
      )}

      {sessions.length > 0 && (
        <AppText variant="caption" color={C.text3} style={styles.sessionHint}>
          {sessions.length} session{sessions.length !== 1 ? 's' : ''} — tap to view or edit attendance
        </AppText>
      )}

      {loading && <SkeletonList count={4} />}
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.screenHeader}>
        <View style={styles.headerText}>
          <AppText variant="heading">
            Attendance
          </AppText>
          <AppText variant="caption" color={C.text2}>
            Start a session then mark each student present or absent.
          </AppText>
        </View>
        <Touchable
          onPress={() => setCreateVisible(true)}
          style={styles.addBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="New session"
        >
          <MaterialIcons name="add" size={24} color={C.onPrimary} />
        </Touchable>
      </View>

      {/* No batches state */}
      {batches.length === 0 && !loading ? (
        <View style={styles.empty}>
          <AppText size={32}>📋</AppText>
          <AppText variant="subheading" style={{ marginTop: spacing.md }}>
            No batches found
          </AppText>
          <AppText variant="caption" color={C.text2} style={{ marginTop: spacing.xs }}>
            Create a batch first, then come back to record attendance.
          </AppText>
        </View>
      ) : (
        <FlatList<Session>
          data={sessions}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <SessionCard session={item} enrollments={enrollments} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.primary}
            />
          }
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptySessions}>
                <AppText size={28}>🗓️</AppText>
                <AppText variant="subheading" style={{ marginTop: 10 }}>
                  No sessions yet
                </AppText>
                <AppText variant="caption" color={C.text2} style={{ marginTop: spacing.xs }}>
                  Tap + to start a new session for this batch.
                </AppText>
              </View>
            ) : null
          }
        />
      )}

      <CreateSessionModal
        visible={createVisible}
        batchId={selectedBatchId}
        batchName={selectedBatch?.name}
        onClose={() => setCreateVisible(false)}
        onCreated={() => {
          if (selectedBatchId !== null) loadBatchData(selectedBatchId);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  screenHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerText: { flex: 1 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },

  filterRow: { marginBottom: spacing.md, flexGrow: 0 },
  filterContent: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  sessionHint: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },

  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  // ── Session card ──────────────────────────────────────────────────────────
  sessionCard: { marginBottom: 10 },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sessionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // ── Attendance sheet ──────────────────────────────────────────────────────
  sheetContainer: { paddingTop: spacing.md },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  countRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: C.outline,
    marginBottom: spacing.md,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  studentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // ── Empty states ──────────────────────────────────────────────────────────
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptySessions: {
    alignItems: 'center',
    paddingTop: 60,
  },
});
