import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { FilterChip } from '../../components/FilterChip';
import { StatusChip } from '../../components/StatusChip';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { Touchable } from '../../components/Touchable';
import { SkeletonList } from '../../components/Skeleton';
import C, { radius, withOpacity } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { toastEmitter } from '../../lib/toastEmitter';
import { haptics } from '../../lib/haptics';
import {
  getBatches,
  getBatchFees,
  getFeeDashboard,
  getFeeStructure,
  setupFeeStructure,
  generateMonthlyRecords,
  markPayment,
  sendFeeReminder,
  getRazorpayPayoutStatus,
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

// ── Connect Payouts Banner ───────────────────────────────────────────────────

function ConnectPayoutsBanner({
  onConnect,
  onDismiss,
}: {
  onConnect: () => void;
  onDismiss: () => void;
}) {
  return (
    <AppCard style={{ ...styles.banner, borderColor: withOpacity(C.warning, 'strong') }}>
      <MaterialIcons name="warning" size={18} color={C.warning} style={{ marginTop: 1 }} />
      <AppText variant="caption" color={C.text} style={styles.bannerText}>
        Connect your Razorpay account to start collecting fees online.
      </AppText>
      <Touchable
        haptic
        onPress={onConnect}
        accessibilityRole="button"
        accessibilityLabel="Connect Payouts"
        hitSlop={8}
      >
        <AppText variant="caption" weight="700" color={C.warning}>Connect</AppText>
      </Touchable>
      <Touchable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        hitSlop={8}
        style={{ marginLeft: spacing.sm }}
      >
        <MaterialIcons name="close" size={18} color={C.text2} />
      </Touchable>
    </AppCard>
  );
}

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
      <View style={[styles.summaryBadge, { backgroundColor: withOpacity(accentColor, 'medium') }]}>
        <View style={[styles.summaryBadgeDot, { backgroundColor: accentColor }]} />
      </View>
      <AppText variant="micro" color={C.text2} style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
        {label}
      </AppText>
      {loading ? (
        <ActivityIndicator size="small" color={accentColor} />
      ) : (
        <AppText variant="heading" color={accentColor}>
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
    <BottomSheetModal visible={visible} onClose={onClose}>
      <AppText variant="heading" style={{ marginBottom: spacing.xs }}>
        Record Payment
      </AppText>
      {record && (
        <AppText variant="caption" color={C.text2} style={{ marginBottom: spacing.xl }}>
          {record.student_name ?? `Enrollment #${record.enrollment_id}`}
          {' · '}
          {formatMonth(record.month)}
        </AppText>
      )}
      <View style={{ gap: spacing.lg }}>
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
      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
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
    </BottomSheetModal>
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
    <BottomSheetModal visible={visible} onClose={onClose}>
      <AppText variant="heading" style={{ marginBottom: spacing.xl }}>
        Set Monthly Fee
      </AppText>
      <AppInput
        label="Monthly Amount (₹) *"
        placeholder="e.g. 2000"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
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
    </BottomSheetModal>
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
        <AppText variant="body" weight="600" style={{ flex: 1 }} numberOfLines={1}>
          {displayName}
        </AppText>
        <StatusChip label={statusLabel} color={statusColor} />
      </View>

      {/* Amounts row */}
      <View style={styles.amountsRow}>
        <View>
          <AppText variant="micro" color={C.text2}>Due</AppText>
          <AppText variant="body" weight="600">{fmtAmount(record.amount_due)}</AppText>
        </View>
        <View>
          <AppText variant="micro" color={C.text2}>Paid</AppText>
          <AppText
            variant="body"
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
          <Touchable
            haptic
            onPress={() => onPay(record)}
            accessibilityRole="button"
            accessibilityLabel={`Record payment for ${displayName}`}
            style={[
              styles.actionBtn,
              { backgroundColor: withOpacity(C.secondary), borderColor: withOpacity(C.secondary, 'strong') },
            ]}
          >
            <AppText variant="caption" weight="600" color={C.secondary}>Pay</AppText>
          </Touchable>
          <Touchable
            onPress={() => onRemind(record.id)}
            disabled={reminding}
            accessibilityRole="button"
            accessibilityLabel={`Send fee reminder to ${displayName}`}
            style={[
              styles.actionBtn,
              {
                backgroundColor: withOpacity(C.whatsapp),
                borderColor: withOpacity(C.whatsapp, 'strong'),
                opacity: reminding ? 0.5 : 1,
              },
            ]}
          >
            <AppText variant="caption" weight="600" color={C.whatsapp}>
              {reminding ? 'Sending…' : '🔔 Remind'}
            </AppText>
          </Touchable>
        </View>
      )}
    </AppCard>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function FeesScreen() {
  const router = useRouter();
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

  // Assume connected until checked, to avoid a flash of the banner.
  const [payoutsConnected, setPayoutsConnected] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);

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

  useEffect(() => {
    getRazorpayPayoutStatus()
      .then(data => setPayoutsConnected(data.status === 'CONNECTED'))
      .catch(() => {}); // fail silent — banner just won't show
  }, []);

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
      haptics.success();
      toastEmitter.emit('Reminder sent', 'success');
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
    haptics.success();
    toastEmitter.emit('Payment recorded', 'success');
    loadDashboard();
  };

  const handleSetupSuccess = () => {
    toastEmitter.emit('Monthly fee saved', 'success');
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
        <Touchable
          onPress={() => setMonth(prevMonth(month))}
          style={styles.arrowBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <AppText size={24} color={C.primary} weight="600">‹</AppText>
        </Touchable>
        <AppText variant="subheading">{formatMonth(month)}</AppText>
        <Touchable
          onPress={() => setMonth(nextMonth(month))}
          style={styles.arrowBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <AppText size={24} color={C.primary} weight="600">›</AppText>
        </Touchable>
      </View>

      {!payoutsConnected && !bannerDismissed && (
        <ConnectPayoutsBanner
          onConnect={() => router.push('/(owner)/settings' as any)}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

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
            <FilterChip
              key={b.id}
              label={b.name}
              active={selectedBatchId === b.id}
              onPress={() => setSelectedBatchId(b.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* No batches state */}
      {batches.length === 0 && !dashLoading && (
        <View style={styles.empty}>
          <AppText size={32}>💰</AppText>
          <AppText variant="subheading" style={{ marginTop: spacing.md }}>
            No active batches
          </AppText>
          <AppText variant="caption" color={C.text2} style={{ marginTop: spacing.xs }}>
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
              <AppText variant="body" color={C.text2} style={{ marginBottom: 14 }}>
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
                <AppText variant="caption" color={C.text}>
                  Monthly Fee: {structure ? fmtAmount(structure.monthly_amount) : '—'}
                </AppText>
              </View>
              <Touchable onPress={() => setSetupVisible(true)} hitSlop={8} accessibilityRole="button">
                <AppText variant="caption" color={C.primary} weight="600">Edit</AppText>
              </Touchable>
              {records.length === 0 && !recordsLoading && (
                <Touchable
                  onPress={handleGenerate}
                  disabled={generating}
                  style={[styles.generateBtn, { opacity: generating ? 0.6 : 1 }]}
                  accessibilityRole="button"
                >
                  <AppText variant="caption" weight="600" color={C.secondary}>
                    {generating ? 'Generating…' : '+ Generate Records'}
                  </AppText>
                </Touchable>
              )}
            </View>
          )}
        </View>
      )}

      {/* Fee records section header */}
      {records.length > 0 && (
        <View style={styles.recordsHeader}>
          <AppText variant="caption" color={C.text2} weight="600">
            Fee Records
          </AppText>
          <AppText variant="caption" color={C.text2}>
            {records.length} student{records.length !== 1 ? 's' : ''}
          </AppText>
        </View>
      )}

      {/* Records loading skeleton */}
      {recordsLoading && <SkeletonList count={3} />}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Screen Header */}
      <View style={styles.screenHeader}>
        <AppText variant="heading">Fee Management</AppText>
      </View>

      <FlatList<FeeRecordRow>
        data={records}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).springify().damping(18)}>
            <FeeRecordCard
              record={item}
              reminding={remindingIds.has(item.id)}
              onPay={setPayRecord}
              onRemind={handleRemind}
            />
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
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          !recordsLoading && selectedBatchId !== null && !noStructure && records.length === 0 ? (
            <View style={styles.emptyRecords}>
              <AppText size={28}>📋</AppText>
              <AppText variant="subheading" style={{ marginTop: 10 }}>
                No fee records
              </AppText>
              <AppText variant="caption" color={C.text2} style={{ marginTop: spacing.xs }}>
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: C.surface,
    borderRadius: radius.md,
  },
  arrowBtn: { padding: spacing.xs },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  bannerText: { flex: 1 },
  summaryGrid: {
    paddingHorizontal: spacing.lg,
    gap: 10,
    marginBottom: spacing.lg,
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
  filterRow: { marginBottom: spacing.md, flexGrow: 0 },
  filterContent: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noStructure: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  structureBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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
    backgroundColor: withOpacity(C.secondary),
    borderWidth: 1,
    borderColor: withOpacity(C.secondary, 'strong'),
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  recordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  recordCard: { marginBottom: spacing.sm },
  recordTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  amountsRow: {
    flexDirection: 'row',
    gap: 28,
    marginBottom: spacing.md,
  },
  recordActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    minHeight: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
  },
  emptyRecords: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
});
