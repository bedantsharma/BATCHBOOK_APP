import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { EmptyState } from '../../components/EmptyState';
import { Touchable } from '../../components/Touchable';
import { StudentScreen } from '../../components/StudentScreen';
import C from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { studentStyles as s } from '../../lib/studentDashboardStyles';
import { formatMonthLabel, prevMonth, nextMonth } from '../../lib/studentDashboard';
import { useStudentData } from '../../context/StudentDataContext';

export default function ScheduleScreen() {
  const {
    schedule,
    upcomingEvents,
    attendance,
    attendanceMonth,
    setAttendanceMonth,
    changeAttendanceMonth,
    attendanceLoading,
  } = useStudentData();

  const attendancePct =
    attendance && attendance.total > 0
      ? Math.round((attendance.present / attendance.total) * 100)
      : 0;
  const pctColor = attendancePct >= 75 ? C.success : C.error;

  const goMonth = (m: string) => {
    setAttendanceMonth(m);
    changeAttendanceMonth(m);
  };

  return (
    <StudentScreen>
      <AppText variant="heading" style={{ marginBottom: spacing.lg }}>Schedule & Attendance</AppText>

      {/* Month picker */}
      <View style={s.monthPicker}>
        <Touchable haptic onPress={() => goMonth(prevMonth(attendanceMonth))} hitSlop={8}
          accessibilityRole="button" accessibilityLabel="Previous month">
          <MaterialIcons name="chevron-left" size={24} color={C.text} />
        </Touchable>
        <AppText variant="body" weight="600">{formatMonthLabel(attendanceMonth)}</AppText>
        <Touchable haptic onPress={() => goMonth(nextMonth(attendanceMonth))} hitSlop={8}
          accessibilityRole="button" accessibilityLabel="Next month">
          <MaterialIcons name="chevron-right" size={24} color={C.text} />
        </Touchable>
      </View>

      {/* Attendance summary */}
      {attendanceLoading ? (
        <ActivityIndicator color={C.primary} style={{ marginVertical: spacing.xl }} />
      ) : (
        <AppCard style={s.summaryCard}>
          <AppText variant="micro" color={C.text2} weight="600" style={s.sectionLabel}>
            ATTENDANCE — {formatMonthLabel(attendanceMonth).toUpperCase()}
          </AppText>
          <AppText variant="hero" color={pctColor}>{attendancePct}%</AppText>
          <AppText variant="caption" color={C.text2} style={{ marginTop: spacing.xs }}>
            {attendance?.present ?? 0} present · {attendance?.total ?? 0} sessions
          </AppText>

          {/* Per-batch attendance breakdown */}
          {attendance && attendance.items.length > 0 ? (
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              {attendance.items.map((item, idx) => {
                const batchPct = item.total > 0 ? Math.round((item.present / item.total) * 100) : 0;
                const bColor = batchPct >= 75 ? C.success : C.error;
                return (
                  <View key={idx} style={s.batchRow}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="caption" weight="600">{item.batch_name}</AppText>
                      <AppText variant="micro" color={C.text2}>{item.subject}</AppText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <AppText variant="body" weight="700" color={bColor}>{batchPct}%</AppText>
                      <AppText variant="micro" color={C.text2}>{item.present}/{item.total}</AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </AppCard>
      )}

      {/* Today's schedule */}
      <View style={{ marginBottom: spacing.xl }}>
        <AppText variant="subheading" style={{ marginBottom: spacing.md }}>Today</AppText>
        {schedule.length === 0 ? (
          <EmptyState compact icon="📭" title="No classes today" message="Enjoy your day off." />
        ) : (
          schedule.map((item, idx) => (
            <AppCard key={String(item.id ?? idx)} style={s.sessionCard}>
              <View style={{ flex: 1 }}>
                <AppText variant="body" weight="600">{item.subject}</AppText>
                <AppText variant="caption" color={C.text2} style={{ marginTop: 2 }}>
                  {item.batchName}
                  {item.topic ? ` · ${item.topic}` : ''}
                </AppText>
              </View>
              <AppText variant="caption" color={C.text2}>{item.time}</AppText>
            </AppCard>
          ))
        )}
      </View>

      {/* Upcoming */}
      <View style={{ marginBottom: spacing.xl }}>
        <AppText variant="subheading" style={{ marginBottom: spacing.md }}>Upcoming</AppText>
        {upcomingEvents.length === 0 ? (
          <EmptyState compact icon="🗓️" title="No upcoming classes" message="New sessions will show up here." />
        ) : (
          upcomingEvents.map((e, idx) => (
            <AppCard key={String(e.id ?? idx)} style={s.sessionCard}>
              <View style={{ flex: 1 }}>
                <AppText variant="body" weight="600">{e.label}</AppText>
                <AppText variant="caption" color={C.text2} style={{ marginTop: 2 }}>{e.sub}</AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="caption" color={C.primary} weight="600">{e.day}</AppText>
                <AppText variant="micro" color={C.text2}>{e.time}</AppText>
              </View>
            </AppCard>
          ))
        )}
      </View>
    </StudentScreen>
  );
}
