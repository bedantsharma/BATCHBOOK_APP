import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { StatusChip } from '../../components/StatusChip';
import { EmptyState } from '../../components/EmptyState';
import { Touchable } from '../../components/Touchable';
import { StudentScreen } from '../../components/StudentScreen';
import C from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { studentStyles as s } from '../../lib/studentDashboardStyles';
import { formatMonthLabel, prevMonth, nextMonth, feeStatusColor, feeStatusLabel } from '../../lib/studentDashboard';
import { useStudentData } from '../../context/StudentDataContext';

export default function FeesScreen() {
  const { feeRecords, feeMonth, setFeeMonth, changeFeeMonth, feeLoading } = useStudentData();

  const goMonth = (m: string) => {
    setFeeMonth(m);
    changeFeeMonth(m);
  };

  return (
    <StudentScreen>
      <AppText variant="heading" style={{ marginBottom: spacing.lg }}>Fee Status</AppText>

      {/* Month picker */}
      <View style={s.monthPicker}>
        <Touchable haptic onPress={() => goMonth(prevMonth(feeMonth))} hitSlop={8}
          accessibilityRole="button" accessibilityLabel="Previous month">
          <MaterialIcons name="chevron-left" size={24} color={C.text} />
        </Touchable>
        <AppText variant="body" weight="600">{formatMonthLabel(feeMonth)}</AppText>
        <Touchable haptic onPress={() => goMonth(nextMonth(feeMonth))} hitSlop={8}
          accessibilityRole="button" accessibilityLabel="Next month">
          <MaterialIcons name="chevron-right" size={24} color={C.text} />
        </Touchable>
      </View>

      {feeLoading ? (
        <ActivityIndicator color={C.primary} style={{ marginVertical: spacing.xl }} />
      ) : feeRecords.length === 0 ? (
        <View style={{ marginTop: spacing.lg }}>
          <EmptyState compact icon="🧾" title="No fee records this month" message="Nothing due for the selected month." />
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          {feeRecords.map((record, idx) => {
            const statusColor = feeStatusColor(record.status);
            const statusText = feeStatusLabel(record.status);
            const isUnpaid =
              record.status === 'NOT_PAID' ||
              record.status === 'PENDING' ||
              record.status === 'PARTIALLY_PAID' ||
              record.status === 'PARTIAL';

            return (
              <AppCard key={idx} style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="subheading">{record.batch_name ?? 'Fee Record'}</AppText>
                    <AppText variant="caption" color={C.text2} style={{ marginTop: 3 }}>
                      Due: ₹{record.amount_due ?? 0}
                    </AppText>
                    {(record.amount_paid ?? 0) > 0 ? (
                      <AppText variant="caption" color={C.text2}>Paid: ₹{record.amount_paid}</AppText>
                    ) : null}
                  </View>
                  <StatusChip label={statusText} color={statusColor} variant="caption" style={s.statusChip} />
                </View>

                {isUnpaid ? (
                  <AppText variant="caption" color={C.text2}>
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
    </StudentScreen>
  );
}
