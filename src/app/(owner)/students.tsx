import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import C, { radius } from '../../constants/colors';
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
          <AppText size={18} weight="700" style={{ marginBottom: 20 }}>
            Add Student
          </AppText>
          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 16 }}>
              {/* Batch Selector */}
              <View>
                <AppText size={13} color={C.text2} style={{ marginBottom: 8 }}>
                  Select Batch *
                </AppText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 4 }}
                >
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {batches.map(b => (
                      <Pressable
                        key={b.id}
                        onPress={() => setSelectedBatchId(b.id)}
                        style={[
                          styles.batchChip,
                          selectedBatchId === b.id && styles.batchChipActive,
                        ]}
                      >
                        <AppText
                          size={13}
                          color={selectedBatchId === b.id ? '#000' : C.text}
                          weight={selectedBatchId === b.id ? '600' : '400'}
                        >
                          {b.name}
                        </AppText>
                      </Pressable>
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

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
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
        </View>
      </View>
    </Modal>
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
          <AppText size={15} weight="600">{displayName}</AppText>
          <AppText size={13} color={C.text2} style={{ marginTop: 2 }}>
            {item.batchName}
          </AppText>
        </View>
        <View style={[styles.statusChip, { backgroundColor: statusColor + '22' }]}>
          <AppText size={11} weight="600" color={statusColor}>
            {statusLabel}
          </AppText>
        </View>
      </View>

      <View style={styles.rowMeta}>
        {item.due_day != null && (
          <AppText size={12} color={C.text2}>
            Due: {item.due_day}{ordinal(item.due_day)}
          </AppText>
        )}
        {item.first_month_amount != null && item.first_month_amount > 0 && (
          <AppText size={12} color={C.text2}>
            ₹{Number(item.first_month_amount).toLocaleString('en-IN')}
          </AppText>
        )}
        <Pressable onPress={confirmRemove} hitSlop={8}>
          <AppText size={12} color={C.error}>Remove</AppText>
        </Pressable>
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
          <AppText size={22} weight="700">Students</AppText>
          <AppText size={13} color={C.text2}>
            {filtered.length} student{filtered.length !== 1 ? 's' : ''}
          </AppText>
        </View>
        <Pressable onPress={() => setAddVisible(true)} style={styles.addBtn}>
          <AppText size={28} color={C.primary}>+</AppText>
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search students..."
          placeholderTextColor={C.text3}
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
        <Pressable
          onPress={() => setSelectedBatch('all')}
          style={[styles.filterChip, selectedBatch === 'all' && styles.filterChipActive]}
        >
          <AppText
            size={13}
            color={selectedBatch === 'all' ? '#000' : C.text}
            weight={selectedBatch === 'all' ? '600' : '400'}
          >
            All Batches
          </AppText>
        </Pressable>
        {batches.map(b => (
          <Pressable
            key={b.id}
            onPress={() => setSelectedBatch(b.id)}
            style={[styles.filterChip, selectedBatch === b.id && styles.filterChipActive]}
          >
            <AppText
              size={13}
              color={selectedBatch === b.id ? '#000' : C.text}
              weight={selectedBatch === b.id ? '600' : '400'}
            >
              {b.name}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <EnrollmentRow item={item} onRemove={handleRemove} />
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
            <AppText size={16} weight="600" style={{ marginTop: 12 }}>
              No students yet
            </AppText>
            <AppText size={14} color={C.text2} style={{ marginTop: 4 }}>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  addBtn: { padding: 8 },
  searchBar: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: {
    backgroundColor: C.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 42,
    color: C.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: C.outline,
  },
  filterRow: { marginBottom: 8, maxHeight: 46 },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.surface2,
    borderRadius: radius.lg,
  },
  filterChipActive: { backgroundColor: C.primary },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  rowMeta: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', alignItems: 'center' },
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
  batchChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.surface2,
    borderRadius: radius.lg,
  },
  batchChipActive: { backgroundColor: C.primary },
  empty: { alignItems: 'center', paddingTop: 80 },
});
