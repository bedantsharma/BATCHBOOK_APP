import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { StatusChip } from '../../components/StatusChip';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { Touchable } from '../../components/Touchable';
import { AnimatedProgressBar } from '../../components/AnimatedProgressBar';
import { SkeletonList } from '../../components/Skeleton';
import { ErrorRetry } from '../../components/ErrorRetry';
import C from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { toastEmitter } from '../../lib/toastEmitter';
import { haptics } from '../../lib/haptics';
import {
  getBatches,
  createBatch,
  inviteStudent,
  getEnrollmentsByBatch,
  type Batch,
} from '../../services/ownerService';

// ── Design helpers ──────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: C.success,
  CLOSING: C.warning,
  ARCHIVED: C.text2,
};

function formatTime(t?: string | null): string {
  if (!t) return '';
  const parts = t.split(':');
  const h = parseInt(parts[0] ?? '0', 10);
  const m = parts[1] ?? '00';
  const suffix = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${m} ${suffix}`;
}

// ── Create Batch Modal ──────────────────────────────────────────────────────

interface CreateBatchForm {
  name: string;
  subject: string;
  grade: string;
  start_time: string;
  end_time: string;
  max_capacity: string;
}

function CreateBatchModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<CreateBatchForm>({
    name: '',
    subject: '',
    grade: '',
    start_time: '',
    end_time: '',
    max_capacity: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateBatchForm, string>>>({});

  const set = (key: keyof CreateBatchForm) => (val: string) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof CreateBatchForm, string>> = {};
    if (!form.name.trim()) next.name = 'Batch name is required.';
    if (form.max_capacity.trim()) {
      const cap = parseInt(form.max_capacity, 10);
      if (isNaN(cap) || cap <= 0) next.max_capacity = 'Capacity must be a positive number.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await createBatch({
        name: form.name.trim(),
        subject: form.subject.trim() || undefined,
        grade: form.grade.trim() || undefined,
        start_time: form.start_time.trim() || undefined,
        end_time: form.end_time.trim() || undefined,
        max_capacity: form.max_capacity ? parseInt(form.max_capacity, 10) : undefined,
      });
      setForm({ name: '', subject: '', grade: '', start_time: '', end_time: '', max_capacity: '' });
      setErrors({});
      haptics.success();
      toastEmitter.emit('Batch created', 'success');
      onCreated();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      <AppText variant="heading" style={{ marginBottom: spacing.xl }}>
        New Batch
      </AppText>
      <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.lg }}>
          <AppInput
            label="Batch Name *"
            placeholder="e.g. 10th Maths Morning"
            value={form.name}
            onChangeText={set('name')}
            error={errors.name}
          />
          <AppInput
            label="Subject"
            placeholder="e.g. Mathematics"
            value={form.subject}
            onChangeText={set('subject')}
          />
          <AppInput
            label="Grade"
            placeholder="e.g. 10th"
            value={form.grade}
            onChangeText={set('grade')}
          />
          <AppInput
            label="Start Time"
            placeholder="e.g. 07:00"
            value={form.start_time}
            onChangeText={set('start_time')}
          />
          <AppInput
            label="End Time"
            placeholder="e.g. 08:30"
            value={form.end_time}
            onChangeText={set('end_time')}
          />
          <AppInput
            label="Capacity"
            placeholder="e.g. 20"
            value={form.max_capacity}
            onChangeText={set('max_capacity')}
            keyboardType="number-pad"
            error={errors.max_capacity}
          />
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
        <AppButton
          label="Cancel"
          onPress={onClose}
          variant="secondary"
          style={{ flex: 1 }}
        />
        <AppButton
          label="Create"
          onPress={handleCreate}
          loading={loading}
          disabled={!form.name.trim()}
          style={{ flex: 1 }}
        />
      </View>
    </BottomSheetModal>
  );
}

// ── Add Student Modal ───────────────────────────────────────────────────────

interface AddStudentForm {
  student_name: string;
  parent_name: string;
  parent_phone: string;
  due_day: string;
  first_month_amount: string;
}

function AddStudentModal({
  visible,
  batch,
  onClose,
  onAdded,
}: {
  visible: boolean;
  batch: Batch | null;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState<AddStudentForm>({
    student_name: '',
    parent_name: '',
    parent_phone: '',
    due_day: '1',
    first_month_amount: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof AddStudentForm, string>>>({});

  const set = (key: keyof AddStudentForm) => (val: string) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof AddStudentForm, string>> = {};
    if (!form.student_name.trim()) next.student_name = 'Student name is required.';
    if (form.parent_phone && form.parent_phone.length !== 10) {
      next.parent_phone = 'Enter a 10-digit phone number.';
    }
    const day = parseInt(form.due_day, 10);
    if (isNaN(day) || day < 1 || day > 31) next.due_day = 'Due day must be between 1 and 31.';
    if (form.first_month_amount.trim()) {
      const amt = parseFloat(form.first_month_amount);
      if (isNaN(amt) || amt < 0) next.first_month_amount = 'Enter a valid amount.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleAdd = async () => {
    if (!batch || !validate()) return;
    setLoading(true);
    try {
      await inviteStudent({
        student_name: form.student_name.trim(),
        parent_name: form.parent_name.trim(),
        parent_phone: form.parent_phone.trim(),
        batch_id: batch.id,
        due_day: parseInt(form.due_day, 10) || 1,
        first_month_amount: parseFloat(form.first_month_amount) || 0,
      });
      setForm({
        student_name: '',
        parent_name: '',
        parent_phone: '',
        due_day: '1',
        first_month_amount: '',
      });
      setErrors({});
      haptics.success();
      toastEmitter.emit('Student added', 'success');
      onAdded();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      <AppText variant="heading" style={{ marginBottom: spacing.xs }}>
        Add Student
      </AppText>
      {batch && (
        <AppText variant="caption" color={C.text2} style={{ marginBottom: spacing.xl }}>
          to {batch.name}
        </AppText>
      )}
      <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.lg }}>
          <AppInput
            label="Student Name *"
            placeholder="Full name"
            value={form.student_name}
            onChangeText={set('student_name')}
            error={errors.student_name}
          />
          <AppInput
            label="Parent Name"
            placeholder="Full name"
            value={form.parent_name}
            onChangeText={set('parent_name')}
          />
          <AppInput
            label="Parent Phone"
            placeholder="10-digit number"
            value={form.parent_phone}
            onChangeText={v => set('parent_phone')(v.replace(/\D/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            error={errors.parent_phone}
          />
          <AppInput
            label="Fee Due Day"
            placeholder="e.g. 5 (day of month)"
            value={form.due_day}
            onChangeText={set('due_day')}
            keyboardType="number-pad"
            error={errors.due_day}
          />
          <AppInput
            label="First Month Amount (₹)"
            placeholder="e.g. 2000"
            value={form.first_month_amount}
            onChangeText={set('first_month_amount')}
            keyboardType="decimal-pad"
            error={errors.first_month_amount}
          />
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
        <AppButton
          label="Cancel"
          onPress={onClose}
          variant="secondary"
          style={{ flex: 1 }}
        />
        <AppButton
          label="Add"
          onPress={handleAdd}
          loading={loading}
          disabled={!form.student_name.trim()}
          style={{ flex: 1 }}
        />
      </View>
    </BottomSheetModal>
  );
}

// ── Batch Card ──────────────────────────────────────────────────────────────

function BatchCard({
  batch,
  onAddStudent,
}: {
  batch: Batch;
  onAddStudent: (b: Batch) => void;
}) {
  const [enrolledCount, setEnrolledCount] = useState<number | null>(null);

  useEffect(() => {
    getEnrollmentsByBatch(batch.id)
      .then(data => setEnrolledCount(data.filter(e => e.is_active !== false).length))
      .catch(() => setEnrolledCount(0));
  }, [batch.id]);

  const capacity = batch.max_capacity ?? 0;
  const enrolled = enrolledCount ?? 0;
  const pct =
    capacity > 0 && enrolledCount !== null ? Math.min(enrolled / capacity, 1) : 0;
  const statusKey = batch.status ?? 'ACTIVE';
  const statusColor = STATUS_COLOR[statusKey] ?? C.text2;
  const startFmt = formatTime(batch.start_time);
  const endFmt = formatTime(batch.end_time);
  const timingStr =
    startFmt && endFmt ? `${startFmt} – ${endFmt}` : startFmt || endFmt;

  return (
    <AppCard>
      {/* Header row */}
      <View style={styles.batchHeader}>
        <View style={{ flex: 1 }}>
          <AppText variant="subheading">
            {batch.name}
          </AppText>
          <AppText variant="caption" color={C.text2} style={{ marginTop: 2 }}>
            {[batch.subject, batch.grade].filter(Boolean).join(' · ')}
          </AppText>
        </View>
        <StatusChip label={statusKey} color={statusColor} />
      </View>

      {/* Timing */}
      {!!timingStr && (
        <AppText variant="caption" color={C.text2} style={{ marginTop: spacing.sm }}>
          {'🕐 ' + timingStr}
        </AppText>
      )}

      {/* Days */}
      {batch.days_of_week && batch.days_of_week.length > 0 && (
        <AppText variant="caption" color={C.text2} style={{ marginTop: spacing.xs }}>
          {'📅 ' + batch.days_of_week.join(' · ')}
        </AppText>
      )}

      {/* Capacity progress */}
      {capacity > 0 && (
        <View style={{ marginTop: spacing.md }}>
          {enrolledCount === null ? (
            <ActivityIndicator
              size="small"
              color={C.primary}
              style={{ alignSelf: 'flex-start' }}
            />
          ) : (
            <>
              <AnimatedProgressBar progress={pct} height={4} />
              <AppText variant="caption" color={C.text2} style={{ marginTop: spacing.xs }}>
                {enrolled} / {capacity} students
              </AppText>
            </>
          )}
        </View>
      )}

      <AppButton
        label="Add Student"
        onPress={() => onAddStudent(batch)}
        variant="secondary"
        style={{ marginTop: spacing.md }}
      />
    </AppCard>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function BatchesScreen() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [addStudentBatch, setAddStudentBatch] = useState<Batch | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getBatches();
      setBatches(Array.isArray(data) ? data : []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onRetry = () => {
    setLoading(true);
    load();
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <AppText variant="heading">
          Batches
        </AppText>
        <Touchable
          onPress={() => setCreateVisible(true)}
          style={styles.addBtn}
          accessibilityRole="button"
          accessibilityLabel="Create batch"
        >
          <AppText size={28} color={C.primary}>
            +
          </AppText>
        </Touchable>
      </View>

      {loading ? (
        <SkeletonList count={4} />
      ) : error && batches.length === 0 ? (
        <ErrorRetry onRetry={onRetry} />
      ) : (
        <FlatList
          data={batches}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 50).springify().damping(18)}>
              <BatchCard batch={item} onAddStudent={b => setAddStudentBatch(b)} />
            </Animated.View>
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
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppText size={36}>📚</AppText>
              <AppText variant="subheading" style={{ marginTop: spacing.md }}>
                No batches yet
              </AppText>
              <AppText variant="body" color={C.text2} style={{ marginTop: spacing.xs }}>
                Tap + to create your first batch
              </AppText>
            </View>
          }
        />
      )}

      <CreateBatchModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreated={load}
      />
      <AddStudentModal
        visible={addStudentBatch !== null}
        batch={addStudentBatch}
        onClose={() => setAddStudentBatch(null)}
        onAdded={load}
      />
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  addBtn: { padding: spacing.sm },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  batchHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  empty: { alignItems: 'center', paddingTop: 80 },
});
