import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { FilterChip } from '../../components/FilterChip';
import { StatusChip } from '../../components/StatusChip';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { Touchable } from '../../components/Touchable';
import C from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { toastEmitter } from '../../lib/toastEmitter';
import { haptics } from '../../lib/haptics';
import {
  getBatches,
  getEnrollmentsByBatch,
  inviteStudent,
  removeEnrollment,
  type Batch,
  type Enrollment,
} from '../../services/ownerService';

// ── Types ───────────────────────────────────────────────────────────────────

/**
 * API response enrollment has denormalized fields not reflected in the
 * TypeScript type: student_name (joined), fee_status (latest month status).
 */
type EnrollmentRow = Enrollment & {
  batchName: string;
  student_name?: string;
  fee_status?: string;
};

// ── Design helpers ──────────────────────────────────────────────────────────

/**
 * Handle both the web-source values (FULLY_PAID/PARTIALLY_PAID/NOT_PAID)
 * and the ownerService FeeRecord values (PAID/PARTIAL/PENDING).
 */
const FEE_STATUS_COLOR: Record<string, string> = {
  PAID: C.success,
  FULLY_PAID: C.success,
  PARTIAL: C.warning,
  PARTIALLY_PAID: C.warning,
  PENDING: C.error,
  NOT_PAID: C.error,
};

const FEE_STATUS_LABEL: Record<string, string> = {
  PAID: 'Paid',
  FULLY_PAID: 'Paid',
  PARTIAL: 'Partial',
  PARTIALLY_PAID: 'Partial',
  PENDING: 'Unpaid',
  NOT_PAID: 'Unpaid',
};

function ordinal(n: number | undefined): string {
  if (n == null) return '';
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// ── Add Student Modal ───────────────────────────────────────────────────────

function AddStudentModal({
  visible,
  batches,
  onClose,
  onAdded,
}: {
  visible: boolean;
  batches: Batch[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [studentName, setStudentName] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [firstMonthAmount, setFirstMonthAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setSelectedBatchId(null);
    setStudentName('');
    setParentName('');
    setParentPhone('');
    setDueDay('1');
    setFirstMonthAmount('');
  };

  const handleAdd = async () => {
    if (selectedBatchId == null || !studentName.trim()) return;
    setLoading(true);
    try {
      await inviteStudent({
        student_name: studentName.trim(),
        parent_name: parentName.trim(),
        parent_phone: parentPhone.trim(),
        batch_id: selectedBatchId,
        due_day: parseInt(dueDay, 10) || 1,
        first_month_amount: parseFloat(firstMonthAmount) || 0,
      });
      reset();
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
      <AppText variant="heading" style={{ marginBottom: spacing.xl }}>
        Add Student
      </AppText>
      <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.lg }}>
          {/* Batch Selector */}
          <View>
            <AppText variant="caption" color={C.text2} style={{ marginBottom: spacing.sm }}>
              Select Batch *
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: spacing.xs }}
            >
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {batches.map(b => (
                  <FilterChip
                    key={b.id}
                    label={b.name}
                    active={selectedBatchId === b.id}
                    onPress={() => setSelectedBatchId(b.id)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <AppInput
            label="Student Name *"
            placeholder="Full name"
            value={studentName}
            onChangeText={setStudentName}
          />
          <AppInput
            label="Parent Name"
            placeholder="Full name"
            value={parentName}
            onChangeText={setParentName}
          />
          <AppInput
            label="Parent Phone"
            placeholder="10-digit number"
            value={parentPhone}
            onChangeText={v => setParentPhone(v.replace(/\D/g, '').slice(0, 10))}
            keyboardType="phone-pad"
          />
          <AppInput
            label="Fee Due Day"
            placeholder="e.g. 5"
            value={dueDay}
            onChangeText={setDueDay}
            keyboardType="number-pad"
          />
          <AppInput
            label="First Month Amount (₹)"
            placeholder="e.g. 2000"
            value={firstMonthAmount}
            onChangeText={setFirstMonthAmount}
            keyboardType="decimal-pad"
          />
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
        <AppButton
          label="Cancel"
          onPress={() => { reset(); onClose(); }}
          variant="secondary"
          style={{ flex: 1 }}
        />
        <AppButton
          label="Add"
          onPress={handleAdd}
          loading={loading}
          disabled={selectedBatchId == null || !studentName.trim()}
          style={{ flex: 1 }}
        />
      </View>
    </BottomSheetModal>
  );
}

// ── Enrollment Row ──────────────────────────────────────────────────────────

function EnrollmentRow({
  item,
  onRemove,
}: {
  item: EnrollmentRow;
  onRemove: (id: number) => void;
}) {
  const feeStatus = item.fee_status ?? 'NOT_PAID';
  const statusColor = FEE_STATUS_COLOR[feeStatus] ?? C.text2;
  const statusLabel = FEE_STATUS_LABEL[feeStatus] ?? feeStatus;
  const displayName = item.student_name ?? `Student #${item.student_id}`;

  const confirmRemove = () => {
    Alert.alert(
      'Remove Student',
      `Remove ${displayName} from ${item.batchName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onRemove(item.id) },
      ]
    );
  };

  return (
    <AppCard>
      <View style={styles.rowTop}>
        <View style={{ flex: 1 }}>
          <AppText variant="subheading">{displayName}</AppText>
          <AppText variant="caption" color={C.text2} style={{ marginTop: 2 }}>
            {item.batchName}
          </AppText>
        </View>
        <StatusChip label={statusLabel} color={statusColor} />
      </View>

      <View style={styles.rowMeta}>
        {item.due_day != null && (
          <AppText variant="caption" color={C.text2}>
            Due: {item.due_day}{ordinal(item.due_day)}
          </AppText>
        )}
        {item.first_month_amount != null && item.first_month_amount > 0 && (
          <AppText variant="caption" color={C.text2}>
            ₹{Number(item.first_month_amount).toLocaleString('en-IN')}
          </AppText>
        )}
        <Touchable
          onPress={confirmRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${displayName}`}
        >
          <AppText variant="caption" color={C.error}>Remove</AppText>
        </Touchable>
      </View>
    </AppCard>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function StudentsScreen() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [addVisible, setAddVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const batchList = await getBatches();
      const resolvedBatches = Array.isArray(batchList) ? batchList : [];
      setBatches(resolvedBatches);

      const allEnrollments: EnrollmentRow[] = [];
      await Promise.all(
        resolvedBatches.map(async (b: Batch) => {
          try {
            const enr = await getEnrollmentsByBatch(b.id);
            const list: Enrollment[] = Array.isArray(enr) ? enr : [];
            list
              .filter(e => e.is_active !== false)
              .forEach(e =>
                allEnrollments.push({ ...(e as Enrollment & { student_name?: string; fee_status?: string }), batchName: b.name })
              );
          } catch {
            // skip failed batch — don't block others
          }
        })
      );
      setEnrollments(allEnrollments);
    } catch {
      // silently ignore — user can pull-to-refresh
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleRemove = async (id: number) => {
    try {
      await removeEnrollment(id);
      setEnrollments(prev => prev.filter(e => e.id !== id));
      toastEmitter.emit('Student removed', 'info');
    } catch {
      Alert.alert('Error', 'Failed to remove student. Please try again.');
    }
  };

  const filtered = useMemo(() => {
    return enrollments
      .filter(e => selectedBatch === 'all' || e.batch_id === selectedBatch)
      .filter(e => {
        if (!search.trim()) return true;
        const name = e.student_name ?? `Student #${e.student_id}`;
        return name.toLowerCase().includes(search.toLowerCase());
      });
  }, [enrollments, selectedBatch, search]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <AppText variant="heading">Students</AppText>
          <AppText variant="caption" color={C.text2}>
            {filtered.length} student{filtered.length !== 1 ? 's' : ''}
          </AppText>
        </View>
        <Touchable
          onPress={() => setAddVisible(true)}
          style={styles.addBtn}
          accessibilityRole="button"
          accessibilityLabel="Add student"
        >
          <AppText size={28} color={C.primary}>+</AppText>
        </Touchable>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <AppInput
          placeholder="Search students..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Batch Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        <FilterChip
          label="All Batches"
          active={selectedBatch === 'all'}
          onPress={() => setSelectedBatch('all')}
        />
        {batches.map(b => (
          <FilterChip
            key={b.id}
            label={b.name}
            active={selectedBatch === b.id}
            onPress={() => setSelectedBatch(b.id)}
          />
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).springify().damping(18)}>
            <EnrollmentRow item={item} onRemove={handleRemove} />
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
            <AppText size={36}>👨‍🎓</AppText>
            <AppText variant="subheading" style={{ marginTop: spacing.md }}>
              No students yet
            </AppText>
            <AppText variant="body" color={C.text2} style={{ marginTop: spacing.xs }}>
              {search ? 'No students match your search.' : 'Add students to your batches'}
            </AppText>
          </View>
        }
      />

      <AddStudentModal
        visible={addVisible}
        batches={batches}
        onClose={() => setAddVisible(false)}
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
    paddingBottom: spacing.sm,
  },
  addBtn: { padding: spacing.sm },
  searchBar: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  filterRow: { marginBottom: spacing.sm, maxHeight: 46 },
  filterContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: 10 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  rowMeta: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 80 },
});
