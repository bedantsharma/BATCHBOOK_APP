import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ScrollView,
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
import C, { radius } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { toastEmitter } from '../../lib/toastEmitter';
import { haptics } from '../../lib/haptics';
import {
  getBatches,
  getEnrollmentsByBatch,
  getStudentScores,
  createTestScore,
  type Batch,
  type Enrollment,
} from '../../services/ownerService';

// ─── Local types ──────────────────────────────────────────────────────────────

interface TestScore {
  id: number;
  test_name: string;
  subject: string;
  date: string;
  max_marks: number;
  obtained_marks: number;
}

type EnrollmentRow = Enrollment & { student_name?: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function formatScoreDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function percentageColor(pct: number): string {
  if (pct >= 75) return C.success;
  if (pct >= 50) return C.warning;
  return C.error;
}

// ─── Score Row ────────────────────────────────────────────────────────────────

function ScoreRow({ score }: { score: TestScore }) {
  const pct =
    score.max_marks > 0
      ? Math.round((score.obtained_marks / score.max_marks) * 100)
      : 0;
  const pctColor = percentageColor(pct);

  return (
    <View style={styles.scoreRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" weight="600">
          {score.test_name}
        </AppText>
        <AppText variant="caption" color={C.text2}>
          {score.subject} · {formatScoreDate(score.date)}
        </AppText>
      </View>
      <View style={styles.scoreRight}>
        <AppText variant="caption" weight="600">
          {score.obtained_marks} / {score.max_marks}
        </AppText>
        <StatusChip label={`${pct}%`} color={pctColor} />
      </View>
    </View>
  );
}

// ─── Add Score Modal ──────────────────────────────────────────────────────────

interface AddScoreModalProps {
  visible: boolean;
  enrollmentId: number | null;
  studentName: string;
  onClose: () => void;
  onSaved: (score: TestScore) => void;
}

function AddScoreModal({
  visible,
  enrollmentId,
  studentName,
  onClose,
  onSaved,
}: AddScoreModalProps) {
  const [testName, setTestName] = useState('');
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState(todayISO());
  const [maxMarks, setMaxMarks] = useState('');
  const [obtainedMarks, setObtainedMarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setTestName('');
    setSubject('');
    setDate(todayISO());
    setMaxMarks('');
    setObtainedMarks('');
    setError('');
  }

  async function handleSubmit() {
    if (enrollmentId === null) return;

    if (!testName.trim() || !subject.trim() || !date.trim() || !maxMarks || obtainedMarks === '') {
      setError('All fields are required.');
      return;
    }

    const max = Number(maxMarks);
    const obtained = Number(obtainedMarks);

    if (isNaN(max) || max <= 0) {
      setError('Max marks must be a positive number.');
      return;
    }
    if (isNaN(obtained) || obtained < 0 || obtained > max) {
      setError('Obtained marks must be between 0 and max marks.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setError('Enter date as YYYY-MM-DD (e.g. 2026-06-28)');
      return;
    }

    setError('');
    setSaving(true);
    try {
      const saved = (await createTestScore({
        enrollment_id: enrollmentId,
        test_name: testName.trim(),
        subject: subject.trim(),
        date: date.trim(),
        max_marks: max,
        obtained_marks: obtained,
      })) as TestScore;
      haptics.success();
      toastEmitter.emit('Score saved successfully.', 'success');
      onSaved(saved);
      reset();
      onClose();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { detail?: string } } };
      setError(axErr?.response?.data?.detail ?? 'Failed to save score. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      <AppText variant="heading" style={{ marginBottom: spacing.xs }}>
        Add Test Score
      </AppText>
      <AppText variant="caption" color={C.text2} style={{ marginBottom: spacing.xl }}>
        {studentName}
      </AppText>

      <View style={{ gap: spacing.lg }}>
        <AppInput
          label="Test Name *"
          placeholder="e.g. Unit Test 1, Mid-Term"
          value={testName}
          onChangeText={t => {
            setTestName(t);
            setError('');
          }}
        />
        <AppInput
          label="Subject *"
          placeholder="e.g. Maths, Science"
          value={subject}
          onChangeText={t => {
            setSubject(t);
            setError('');
          }}
        />
        <AppInput
          label="Date (YYYY-MM-DD) *"
          placeholder={todayISO()}
          value={date}
          onChangeText={t => {
            setDate(t);
            setError('');
          }}
          keyboardType="numbers-and-punctuation"
        />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <AppInput
              label="Max Marks *"
              placeholder="100"
              value={maxMarks}
              onChangeText={t => {
                setMaxMarks(t);
                setError('');
              }}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppInput
              label="Obtained Marks *"
              placeholder="85"
              value={obtainedMarks}
              onChangeText={t => {
                setObtainedMarks(t);
                setError('');
              }}
              keyboardType="numeric"
            />
          </View>
        </View>
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
          label="Save Score"
          onPress={handleSubmit}
          loading={saving}
          disabled={!testName.trim() || !subject.trim()}
          style={{ flex: 1 }}
        />
      </View>
    </BottomSheetModal>
  );
}

// ─── Student Card (collapsible) ───────────────────────────────────────────────

interface StudentCardProps {
  enrollment: EnrollmentRow;
  scoreCache: Record<number, TestScore[]>;
  onScoresCached: (enrollmentId: number, scores: TestScore[]) => void;
}

function StudentCard({ enrollment, scoreCache, onScoresCached }: StudentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loadingScores, setLoadingScores] = useState(false);
  const [addScoreVisible, setAddScoreVisible] = useState(false);

  const cachedScores = scoreCache[enrollment.id];
  const displayName = enrollment.student_name ?? `Student #${enrollment.student_id}`;

  async function handleExpand() {
    // Lazy-load scores on first expand; use cache on subsequent expands
    if (!expanded && cachedScores === undefined) {
      setLoadingScores(true);
      try {
        const data = (await getStudentScores(enrollment.id)) as TestScore[];
        onScoresCached(enrollment.id, Array.isArray(data) ? data : []);
      } catch {
        onScoresCached(enrollment.id, []);
      } finally {
        setLoadingScores(false);
      }
    }
    setExpanded(v => !v);
  }

  function handleScoreSaved(newScore: TestScore) {
    const existing = scoreCache[enrollment.id] ?? [];
    onScoresCached(enrollment.id, [newScore, ...existing]);
  }

  const scores = cachedScores ?? [];

  return (
    <AppCard style={styles.studentCard}>
      {/* Tappable header */}
      <Touchable onPress={handleExpand} style={styles.cardHeader} accessibilityRole="button">
        <View style={{ flex: 1 }}>
          <AppText variant="subheading">
            {displayName}
          </AppText>
          {cachedScores !== undefined && (
            <AppText variant="caption" color={C.text2} style={{ marginTop: 2 }}>
              {scores.length} score{scores.length !== 1 ? 's' : ''}
            </AppText>
          )}
        </View>
        <View style={styles.cardHeaderRight}>
          {loadingScores ? (
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

      {/* Expanded content */}
      {expanded && !loadingScores ? (
        <Animated.View
          entering={FadeInDown.duration(220).springify().damping(18)}
          exiting={FadeOut.duration(140)}
          style={{ marginTop: spacing.md }}
        >
          <View style={styles.divider} />

          {/* Add Score button */}
          <View style={styles.addScoreRow}>
            <Touchable
              haptic
              onPress={() => setAddScoreVisible(true)}
              style={styles.addScoreBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Add score"
            >
              <MaterialIcons name="add" size={16} color={C.primary} />
              <AppText variant="caption" color={C.primary} weight="600">
                Add Score
              </AppText>
            </Touchable>
          </View>

          {/* Score rows */}
          {scores.length === 0 ? (
            <AppText
              variant="caption"
              color={C.text3}
              style={{ textAlign: 'center', paddingVertical: spacing.lg }}
            >
              No scores yet — tap Add Score to record the first test.
            </AppText>
          ) : (
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {scores.map((score, idx) => (
                <ScoreRow key={score.id ?? idx} score={score} />
              ))}
            </View>
          )}
        </Animated.View>
      ) : null}

      <AddScoreModal
        visible={addScoreVisible}
        enrollmentId={enrollment.id}
        studentName={displayName}
        onClose={() => setAddScoreVisible(false)}
        onSaved={handleScoreSaved}
      />
    </AppCard>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TestsScreen() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [scoreCache, setScoreCache] = useState<Record<number, TestScore[]>>({});
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Load batches on mount ─────────────────────────────────────────────────

  const loadBatches = useCallback(async () => {
    setLoadingBatches(true);
    try {
      const data = await getBatches();
      const list = Array.isArray(data) ? data : [];
      setBatches(list);
      if (list.length > 0 && selectedBatchId === null) {
        setSelectedBatchId(list[0].id);
      }
    } catch {
      // silently ignore — user sees empty state
    } finally {
      setLoadingBatches(false);
    }
  }, [selectedBatchId]);

  useEffect(() => {
    loadBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load enrollments when batch changes ───────────────────────────────────

  const loadEnrollments = useCallback(async (batchId: number) => {
    setLoadingEnrollments(true);
    setEnrollments([]);
    try {
      const data = await getEnrollmentsByBatch(batchId);
      setEnrollments(
        (data as EnrollmentRow[]).filter(e => e.is_active !== false)
      );
    } catch {
      setEnrollments([]);
    } finally {
      setLoadingEnrollments(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBatchId !== null) {
      loadEnrollments(selectedBatchId);
    }
  }, [selectedBatchId, loadEnrollments]);

  // ── Pull-to-refresh: reload everything + clear score cache ────────────────

  const onRefresh = async () => {
    setRefreshing(true);
    setScoreCache({});
    try {
      const data = await getBatches();
      const list = Array.isArray(data) ? data : [];
      setBatches(list);
      if (selectedBatchId !== null) {
        await loadEnrollments(selectedBatchId);
      } else if (list.length > 0) {
        setSelectedBatchId(list[0].id);
      }
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  // ── Score cache helpers ───────────────────────────────────────────────────

  function handleScoresCached(enrollmentId: number, scores: TestScore[]) {
    setScoreCache(prev => ({ ...prev, [enrollmentId]: scores }));
  }

  // ── FlatList header (batch chips + hints) ─────────────────────────────────

  const listHeader = (
    <View>
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
              onPress={() => {
                if (b.id !== selectedBatchId) {
                  setScoreCache({});
                  setSelectedBatchId(b.id);
                }
              }}
            />
          ))}
        </ScrollView>
      )}

      {loadingBatches || loadingEnrollments ? <SkeletonList count={4} /> : null}

      {!loadingBatches &&
      !loadingEnrollments &&
      enrollments.length > 0 ? (
        <AppText variant="caption" color={C.text3} style={styles.enrollmentHint}>
          {enrollments.length} student{enrollments.length !== 1 ? 's' : ''} — tap to view scores
        </AppText>
      ) : null}
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      {/* Screen header */}
      <View style={styles.screenHeader}>
        <View>
          <AppText variant="heading">
            Test Scores
          </AppText>
          <AppText variant="caption" color={C.text2}>
            Record and track student test performance.
          </AppText>
        </View>
      </View>

      {/* No batches empty state */}
      {!loadingBatches && batches.length === 0 ? (
        <View style={styles.empty}>
          <AppText size={32}>📝</AppText>
          <AppText variant="subheading" style={{ marginTop: spacing.md }}>
            No batches found
          </AppText>
          <AppText variant="caption" color={C.text2} style={{ marginTop: spacing.xs, textAlign: 'center' }}>
            Create a batch first, then come back to record test scores.
          </AppText>
        </View>
      ) : (
        <FlatList<EnrollmentRow>
          data={enrollments}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <StudentCard
              enrollment={item}
              scoreCache={scoreCache}
              onScoresCached={handleScoresCached}
            />
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
            !loadingBatches && !loadingEnrollments ? (
              <View style={styles.emptyStudents}>
                <AppText size={28}>🎓</AppText>
                <AppText variant="subheading" style={{ marginTop: 10 }}>
                  No students in this batch
                </AppText>
                <AppText variant="caption" color={C.text2} style={{ marginTop: spacing.xs }}>
                  Enroll students first via the Batches or Students tab.
                </AppText>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  screenHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },

  // ── Batch filter chips ────────────────────────────────────────────────────
  filterRow: { marginBottom: spacing.md, maxHeight: 46 },
  filterContent: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  enrollmentHint: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },

  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  // ── Student card ──────────────────────────────────────────────────────────
  studentCard: { marginBottom: 10 },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  divider: {
    height: 1,
    backgroundColor: C.outline,
    marginBottom: spacing.md,
  },

  addScoreRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.xs,
  },
  addScoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: C.primary15,
    borderRadius: radius.md,
  },

  // ── Score row ─────────────────────────────────────────────────────────────
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.surface2,
    borderRadius: radius.md,
    gap: 10,
  },
  scoreRight: {
    alignItems: 'flex-end',
    gap: 4,
  },

  // ── Empty states ──────────────────────────────────────────────────────────
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyStudents: {
    alignItems: 'center',
    paddingTop: 60,
  },
});
