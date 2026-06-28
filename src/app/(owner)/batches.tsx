import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import C, { radius } from '../../constants/colors';
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

  const set = (key: keyof CreateBatchForm) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleCreate = async () => {
    if (!form.name.trim()) return;
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
      onCreated();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <AppText size={18} weight="700" style={{ marginBottom: 20 }}>
            New Batch
          </AppText>
          <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 16 }}>
              <AppInput
                label="Batch Name *"
                placeholder="e.g. 10th Maths Morning"
                value={form.name}
                onChangeText={set('name')}
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
              />
            </View>
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
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
        </View>
      </View>
    </Modal>
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

  const set = (key: keyof AddStudentForm) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleAdd = async () => {
    if (!batch || !form.student_name.trim()) return;
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
      onAdded();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <AppText size={18} weight="700" style={{ marginBottom: 4 }}>
            Add Student
          </AppText>
          {batch && (
            <AppText size={13} color={C.text2} style={{ marginBottom: 20 }}>
              to {batch.name}
            </AppText>
          )}
          <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 16 }}>
              <AppInput
                label="Student Name *"
                placeholder="Full name"
                value={form.student_name}
                onChangeText={set('student_name')}
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
              />
              <AppInput
                label="Fee Due Day"
                placeholder="e.g. 5 (day of month)"
                value={form.due_day}
                onChangeText={set('due_day')}
                keyboardType="number-pad"
              />
              <AppInput
                label="First Month Amount (₹)"
                placeholder="e.g. 2000"
                value={form.first_month_amount}
                onChangeText={set('first_month_amount')}
                keyboardType="decimal-pad"
              />
            </View>
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
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
        </View>
      </View>
    </Modal>
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
          <AppText size={16} weight="700">
            {batch.name}
          </AppText>
          <AppText size={13} color={C.text2} style={{ marginTop: 2 }}>
            {[batch.subject, batch.grade].filter(Boolean).join(' · ')}
          </AppText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
          <AppText size={11} weight="600" color={statusColor}>
            {statusKey}
          </AppText>
        </View>
      </View>

      {/* Timing */}
      {!!timingStr && (
        <AppText size={13} color={C.text2} style={{ marginTop: 8 }}>
          {'🕐 ' + timingStr}
        </AppText>
      )}

      {/* Days */}
      {batch.days_of_week && batch.days_of_week.length > 0 && (
        <AppText size={13} color={C.text2} style={{ marginTop: 4 }}>
          {'📅 ' + batch.days_of_week.join(' · ')}
        </AppText>
      )}

      {/* Capacity progress */}
      {capacity > 0 && (
        <View style={{ marginTop: 12 }}>
          {enrolledCount === null ? (
            <ActivityIndicator
              size="small"
              color={C.primary}
              style={{ alignSelf: 'flex-start' }}
            />
          ) : (
            <>
              <View style={styles.progressTrack}>
                {pct > 0 && <View style={[styles.progressFill, { flex: pct }]} />}
                {pct < 1 && <View style={{ flex: 1 - pct }} />}
              </View>
              <AppText size={12} color={C.text2} style={{ marginTop: 4 }}>
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
        style={{ marginTop: 14 }}
      />
    </AppCard>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function BatchesScreen() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [addStudentBatch, setAddStudentBatch] = useState<Batch | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getBatches();
      setBatches(Array.isArray(data) ? data : []);
    } catch {
      // silently ignore — user can pull-to-refresh
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

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <AppText size={22} weight="700">
          Batches
        </AppText>
        <Pressable onPress={() => setCreateVisible(true)} style={styles.addBtn}>
          <AppText size={28} color={C.primary}>
            +
          </AppText>
        </Pressable>
      </View>

      <FlatList
        data={batches}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <BatchCard batch={item} onAddStudent={b => setAddStudentBatch(b)} />
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
            <AppText size={16} weight="600" style={{ marginTop: 12 }}>
              No batches yet
            </AppText>
            <AppText size={14} color={C.text2} style={{ marginTop: 4 }}>
              Tap + to create your first batch
            </AppText>
          </View>
        }
      />

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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  addBtn: { padding: 8 },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  batchHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  progressTrack: {
    height: 4,
    flexDirection: 'row',
    backgroundColor: C.surface2,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { backgroundColor: C.primary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 24,
    paddingBottom: 40,
  },
  empty: { alignItems: 'center', paddingTop: 80 },
});
