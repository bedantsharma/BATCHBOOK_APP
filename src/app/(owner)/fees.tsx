import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Alert,
  RefreshControl,
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
  getBatchFees,
  getFeeDashboard,
  getFeeStructure,
  setupFeeStructure,
  generateMonthlyRecords,
  markPayment,
  sendFeeReminder,
  type Batch,
  type FeeRecord,
} from '../../services/ownerService';

// ── Types ───────────────────────────────────────────────────────────────────

interface FeeDashboard {
  total_due: number;
  total_collected: number;
  total_pending: number;
  collection_rate: number;
}

interface FeeStructureData {
  monthly_amount: number;
}

/**
 * The API returns denormalized `student_name` not present in the base type.
 */
type FeeRecordRow = FeeRecord & {
  student_name?: string;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function prevMonth(ym: string): string {
  const d = new Date(`${ym}-01`);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

function nextMonth(ym: string): string {
  const d = new Date(`${ym}-01`);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 7);
}

function fmtAmount(val: number): string {
  return `₹${Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

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

// ── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  loading,
  accentColor,
}: {
  label: string;
  value: string;
  loading: boolean;
  accentColor: string;
}) {
  return (
    <AppCard style={styles.summaryCard}>
      <View style={[styles.summaryBadge, { backgroundColor: accentColor + '33' }]}>
        <View style={[styles.summaryBadgeDot, { backgroundColor: accentColor }]} />
      </View>
      <AppText size={11} color={C.text2} style={{ marginTop: 8, marginBottom: 4 }}>
        {label}
      </AppText>
      {loading ? (
        <ActivityIndicator size="small" color={accentColor} />
      ) : (
        <AppText size={18} weight="700" color={accentColor}>
          {value}
        </AppText>
      )}
    </AppCard>
  );
}

// ── Mark Payment Modal ───────────────────────────────────────────────────────

function MarkPaymentModal({
  visible,
  record,
  onClose,
  onPaid,
}: {
  visible: boolean;
  record: FeeRecordRow | null;
  onClose: () => void;
  onPaid: (updated: FeeRecord) => void;
}) {
  const [amountPaid, setAmountPaid] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill when a record is opened
  useEffect(() => {
    if (record) {
      setAmountPaid(record.amount_due.toString());
      setReference(record.reference ?? '');
    }
  }, [record]);

  const handleSubmit = async () => {
    if (!record) return;
    const amount = parseFloat(amountPaid);
    if (isNaN(amount) || amount <= 0) return;
    setLoading(true);
    try {
      const updated = await markPayment(record.id, amount, reference.trim() || null);
      onPaid(updated);
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to record payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = amountPaid.trim().length > 0 && parseFloat(amountPaid) > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <AppText size={18} weight="700" style={{ marginBottom: 6 }}>
            Record Payment
          </AppText>
          {record && (
            <AppText size={13} color={C.text2} style={{ marginBottom: 20 }}>
              {record.student_name ?? `Enrollment #${record.enrollment_id}`}
              {' · '}
              {formatMonth(record.month)}
            </AppText>
          )}
          <View style={{ gap: 16 }}>
            <AppInput
              label="Amount Paid (₹) *"
              placeholder="0"
              value={amountPaid}
              onChangeText={setAmountPaid}
              keyboardType="decimal-pad"
            />
            <AppInput
              label="Reference (optional)"
              placeholder="UPI ref, cheque no., etc."
              value={reference}
              onChangeText={setReference}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
            <AppButton
              label="Cancel"
              onPress={onClose}
              variant="secondary"
              style={{ flex: 1 }}
            />
            <AppButton
              label="Confirm"
              onPress={handleSubmit}
              loading={loading}
              disabled={!canSubmit}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Fee Setup Modal ──────────────────────────────────────────────────────────

function FeeSetupModal({
  visible,
  batchId,
  onClose,
  onSetup,
}: {
  visible: boolean;
  batchId: number | null;
  onClose: () => void;
  onSetup: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (batchId === null) return;
    const monthly = parseFloat(amount);
    if (isNaN(monthly) || monthly <= 0) return;
    setLoading(true);
    try {
      await setupFeeStructure(batchId, monthly);
      setAmount('');
      onSetup();
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to set up fee structure. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = amount.trim().length > 0 && parseFloat(amount) > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <AppText size={18} weight="700" style={{ marginBottom: 20 }}>
            Set Monthly Fee
          </AppText>
          <AppInput
            label="Monthly Amount (₹) *"
            placeholder="e.g. 2000"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
            <AppButton
              label="Cancel"
              onPress={() => { setAmount(''); onClose(); }}
              variant="secondary"
              style={{ flex: 1 }}
            />
            <AppButton
              label="Save"
              onPress={handleSubmit}
              loading={loading}
              disabled={!canSubmit}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Fee Record Card ──────────────────────────────────────────────────────────

function FeeRecordCard({
  record,
  reminding,
  onPay,
  onRemind,
}: {
  record: FeeRecordRow;
  reminding: boolean;
  onPay: (rec: FeeRecordRow) => void;
  onRemind: (id: number) => void;
}) {
  const status = record.status;
  const statusColor = FEE_STATUS_COLOR[status] ?? C.text2;
  const statusLabel = FEE_STATUS_LABEL[status] ?? status;
  // 'PAID' is the canonical value in ownerService types; treat as fully paid
  const isPaid = status === 'PAID';
  const displayName = record.student_name ?? `Enrollment #${record.enrollment_id}`;

  return (
    <AppCard style={styles.recordCard}>
      {/* Name + status chip */}
      <View style={styles.recordTop}>
        <AppText size={14} weight="600" style={{ flex: 1 }} numberOfLines={1}>
          {displayName}
        </AppText>
        <View style={[styles.statusChip, { backgroundColor: statusColor + '22' }]}>
          <AppText size={11} weight="600" color={statusColor}>{statusLabel}</AppText>
        </View>
      </View>

      {/* Amounts row */}
      <View style={styles.amountsRow}>
        <View>
          <AppText size={11} color={C.text2}>Due</AppText>
          <AppText size={14} weight="600">{fmtAmount(record.amount_due)}</AppText>
        </View>
        <View>
          <AppText size={11} color={C.text2}>Paid</AppText>
          <AppText
            size={14}
            weight="600"
            color={record.amount_paid > 0 ? C.success : C.text2}
          >
            {fmtAmount(record.amount_paid)}
          </AppText>
        </View>
      </View>

      {/* Actions (only when not fully paid) */}
      {!isPaid && (
        <View style={styles.recordActions}>
          <Pressable
            onPress={() => onPay(record)}
            style={[
              styles.actionBtn,
              { backgroundColor: C.secondary + '22', borderColor: C.secondary + '44' },
            ]}
          >
            <AppText size={12} weight="600" color={C.secondary}>Pay</AppText>
          </Pressable>
          <Pressable
            onPress={() => onRemind(record.id)}
            disabled={reminding}
            style={[
              styles.actionBtn,
              {
                backgroundColor: '#25D36622',
                borderColor: '#25D36644',
                opacity: reminding ? 0.5 : 1,
              },
            ]}
          >
            <AppText size={12} weight="600" color="#25D366">
              {reminding ? 'Sending…' : '🔔 Remind'}
            </AppText>
          </Pressable>
        </View>
      )}
    </AppCard>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function FeesScreen() {
  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  const [dashboard, setDashboard] = useState<FeeDashboard | null>(null);
  const [dashLoading, setDashLoading] = useState(true);

  const [structure, setStructure] = useState<FeeStructureData | null>(null);
  const [structureLoading, setStructureLoading] = useState(false);
  const [noStructure, setNoStructure] = useState(false);

  const [records, setRecords] = useState<FeeRecordRow[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [payRecord, setPayRecord] = useState<FeeRecordRow | null>(null);
  const [setupVisible, setSetupVisible] = useState(false);
  const [remindingIds, setRemindingIds] = useState<Set<number>>(new Set());

  // ── Data loaders ────────────────────────────────────────────────────────────

  const loadBatches = useCallback(async () => {
    try {
      const data = await getBatches();
      const active = Array.isArray(data) ? data.filter((b: Batch) => b.status !== 'ARCHIVED') : [];
      setBatches(active);
      // Set initial selected batch only if none is selected yet
      if (active.length > 0) {
        setSelectedBatchId(prev => (prev === null ? active[0].id : prev));
      }
    } catch {
      // silently ignore
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const data = await getFeeDashboard(month);
      if (data && typeof data === 'object') {
        setDashboard(data as FeeDashboard);
      } else {
        setDashboard({ total_due: 0, total_collected: 0, total_pending: 0, collection_rate: 0 });
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 404) {
        setDashboard({ total_due: 0, total_collected: 0, total_pending: 0, collection_rate: 0 });
      }
    } finally {
      setDashLoading(false);
    }
  }, [month]);

  const loadStructure = useCallback(async () => {
    if (selectedBatchId === null) return;
    setStructureLoading(true);
    setNoStructure(false);
    try {
      const data = await getFeeStructure(selectedBatchId);
      if (data && typeof data === 'object' && 'monthly_amount' in data) {
        setStructure(data as FeeStructureData);
        setNoStructure(false);
      } else {
        setStructure(null);
        setNoStructure(true);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 404) {
        setStructure(null);
        setNoStructure(true);
      }
    } finally {
      setStructureLoading(false);
    }
  }, [selectedBatchId]);

  const loadRecords = useCallback(async () => {
    if (selectedBatchId === null) return;
    setRecordsLoading(true);
    try {
      const data = await getBatchFees(selectedBatchId, month);
      setRecords(Array.isArray(data) ? (data as FeeRecordRow[]) : []);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 404) {
        setRecords([]);
      }
    } finally {
      setRecordsLoading(false);
    }
  }, [selectedBatchId, month]);

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => { loadBatches(); }, [loadBatches]);
  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { loadStructure(); }, [loadStructure]);
  useEffect(() => { loadRecords(); }, [loadRecords]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (selectedBatchId === null) return;
    setGenerating(true);
    try {
      await generateMonthlyRecords(selectedBatchId, month);
      await loadRecords();
    } catch {
      Alert.alert('Error', 'Failed to generate fee records. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRemind = async (recordId: number) => {
    setRemindingIds(prev => new Set([...prev, recordId]));
    try {
      await sendFeeReminder(recordId);
      Alert.alert('Sent', 'Reminder sent successfully!');
    } catch {
      Alert.alert('Error', 'Failed to send reminder. Please try again.');
    } finally {
      setRemindingIds(prev => {
        const next = new Set(prev);
        next.delete(recordId);
        return next;
      });
    }
  };

  const handlePaymentSuccess = (updated: FeeRecord) => {
    setRecords(prev => prev.map(r => (r.id === updated.id ? { ...r, ...updated } : r)));
    loadDashboard();
  };

  const handleSetupSuccess = () => {
    loadStructure();
    loadRecords();
    loadDashboard();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadBatches(), loadDashboard(), loadStructure(), loadRecords()]);
    setRefreshing(false);
  };

  // ── List Header (rendered inside FlatList) ───────────────────────────────────

  const listHeader = (
    <View>
      {/* Month Picker */}
      <View style={styles.monthPicker}>
        <Pressable
          onPress={() => setMonth(prevMonth(month))}
          style={styles.arrowBtn}
          hitSlop={8}
        >
          <AppText size={24} color={C.primary} weight="600">‹</AppText>
        </Pressable>
        <AppText size={16} weight="600">{formatMonth(month)}</AppText>
        <Pressable
          onPress={() => setMonth(nextMonth(month))}
          style={styles.arrowBtn}
          hitSlop={8}
        >
          <AppText size={24} color={C.primary} weight="600">›</AppText>
        </Pressable>
      </View>

      {/* Summary Cards — 2×2 grid */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryRow}>
          <SummaryCard
            label="Total Due"
            value={dashboard ? fmtAmount(dashboard.total_due) : '—'}
            loading={dashLoading}
            accentColor={C.primary}
          />
          <SummaryCard
            label="Collected"
            value={dashboard ? fmtAmount(dashboard.total_collected) : '—'}
            loading={dashLoading}
            accentColor={C.success}
          />
        </View>
        <View style={styles.summaryRow}>
          <SummaryCard
            label="Pending"
            value={dashboard ? fmtAmount(dashboard.total_pending) : '—'}
            loading={dashLoading}
            accentColor={C.warning}
          />
          <SummaryCard
            label="Collection Rate"
            value={dashboard ? `${Number(dashboard.collection_rate).toFixed(1)}%` : '—'}
            loading={dashLoading}
            accentColor={C.secondary}
          />
        </View>
      </View>

      {/* Batch Chips */}
      {batches.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          {batches.map(b => (
            <Pressable
              key={b.id}
              onPress={() => setSelectedBatchId(b.id)}
              style={[
                styles.filterChip,
                selectedBatchId === b.id && styles.filterChipActive,
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
        </ScrollView>
      )}

      {/* No batches state */}
      {batches.length === 0 && !dashLoading && (
        <View style={styles.empty}>
          <AppText size={32}>💰</AppText>
          <AppText size={16} weight="600" style={{ marginTop: 12 }}>
            No active batches
          </AppText>
          <AppText size={13} color={C.text2} style={{ marginTop: 4 }}>
            Create a batch first, then set up fees here.
          </AppText>
        </View>
      )}

      {/* Per-batch section */}
      {selectedBatchId !== null && (
        <View style={{ marginTop: 4 }}>
          {structureLoading ? (
            <ActivityIndicator
              size="small"
              color={C.primary}
              style={{ marginVertical: 20 }}
            />
          ) : noStructure ? (
            /* No fee structure: show setup button */
            <View style={styles.noStructure}>
              <AppText size={14} color={C.text2} style={{ marginBottom: 14 }}>
                No monthly fee set for this batch.
              </AppText>
              <AppButton
                label="Set Up Fees"
                onPress={() => setSetupVisible(true)}
                style={{ alignSelf: 'center' }}
              />
            </View>
          ) : (
            /* Has structure: show bar + optional generate button */
            <View style={styles.structureBar}>
              <View style={styles.structureChip}>
                <AppText size={12} color={C.text}>
                  Monthly Fee: {structure ? fmtAmount(structure.monthly_amount) : '—'}
                </AppText>
              </View>
              <Pressable onPress={() => setSetupVisible(true)} hitSlop={8}>
                <AppText size={12} color={C.primary} weight="600">Edit</AppText>
              </Pressable>
              {records.length === 0 && !recordsLoading && (
                <Pressable
                  onPress={handleGenerate}
                  disabled={generating}
                  style={[styles.generateBtn, { opacity: generating ? 0.6 : 1 }]}
                >
                  <AppText size={12} weight="600" color={C.secondary}>
                    {generating ? 'Generating…' : '+ Generate Records'}
                  </AppText>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}

      {/* Fee records section header */}
      {records.length > 0 && (
        <View style={styles.recordsHeader}>
          <AppText size={13} color={C.text2} weight="600">
            Fee Records
          </AppText>
          <AppText size={13} color={C.text2}>
            {records.length} student{records.length !== 1 ? 's' : ''}
          </AppText>
        </View>
      )}

      {/* Records loading indicator */}
      {recordsLoading && (
        <ActivityIndicator
          size="small"
          color={C.primary}
          style={{ marginVertical: 20 }}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Screen Header */}
      <View style={styles.screenHeader}>
        <AppText size={22} weight="700">Fee Management</AppText>
      </View>

      <FlatList<FeeRecordRow>
        data={records}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <FeeRecordCard
            record={item}
            reminding={remindingIds.has(item.id)}
            onPay={setPayRecord}
            onRemind={handleRemind}
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
          !recordsLoading && selectedBatchId !== null && !noStructure && records.length === 0 ? (
            <View style={styles.emptyRecords}>
              <AppText size={28}>📋</AppText>
              <AppText size={15} weight="600" style={{ marginTop: 10 }}>
                No fee records
              </AppText>
              <AppText size={13} color={C.text2} style={{ marginTop: 4 }}>
                Generate records for {formatMonth(month)}
              </AppText>
            </View>
          ) : null
        }
      />

      <MarkPaymentModal
        visible={payRecord !== null}
        record={payRecord}
        onClose={() => setPayRecord(null)}
        onPaid={handlePaymentSuccess}
      />

      <FeeSetupModal
        visible={setupVisible}
        batchId={selectedBatchId}
        onClose={() => setSetupVisible(false)}
        onSetup={handleSetupSuccess}
      />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  screenHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderRadius: radius.md,
  },
  arrowBtn: { padding: 4 },
  summaryGrid: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
  },
  summaryBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBadgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  filterRow: { marginBottom: 12, maxHeight: 46 },
  filterContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.surface2,
    borderRadius: radius.lg,
  },
  filterChipActive: { backgroundColor: C.primary },
  noStructure: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  structureBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
    flexWrap: 'wrap',
  },
  structureChip: {
    backgroundColor: C.surface2,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  generateBtn: {
    backgroundColor: C.secondary + '22',
    borderWidth: 1,
    borderColor: C.secondary + '44',
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  recordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  recordCard: { marginBottom: 8 },
  recordTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  amountsRow: {
    flexDirection: 'row',
    gap: 28,
    marginBottom: 12,
  },
  recordActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  emptyRecords: {
    alignItems: 'center',
    paddingTop: 40,
  },
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
});
