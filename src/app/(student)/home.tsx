import React from 'react';
import { View } from 'react-native';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { SkeletonList } from '../../components/Skeleton';
import { ErrorRetry } from '../../components/ErrorRetry';
import { EmptyState } from '../../components/EmptyState';
import { StudentScreen } from '../../components/StudentScreen';
import C from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { studentStyles as s } from '../../lib/studentDashboardStyles';
import { useStudentData } from '../../context/StudentDataContext';

export default function HomeScreen() {
  const { profile, attendance, schedule, upcomingEvents, loading, error, retry } = useStudentData();

  if (loading) {
    return (
      <StudentScreen scroll={false}>
        <View style={{ padding: spacing.xl }}>
          <SkeletonList count={4} />
        </View>
      </StudentScreen>
    );
  }

  if (error) {
    return (
      <StudentScreen scroll={false}>
        <ErrorRetry title="Could not load dashboard" message={error} onRetry={retry} />
      </StudentScreen>
    );
  }

  const attendancePct =
    attendance && attendance.total > 0
      ? Math.round((attendance.present / attendance.total) * 100)
      : 0;
  const pctColor = attendancePct >= 75 ? C.success : C.error;

  return (
    <StudentScreen>
      {/* Greeting */}
      <View style={{ marginBottom: spacing.xl }}>
        <AppText variant="heading">Hello, {profile?.name ?? 'Student'} 👋</AppText>
        <AppText variant="caption" color={C.text2} style={{ marginTop: spacing.xs }}>
          {attendance?.month ?? ''}
        </AppText>
      </View>

      {/* Fee Due Banner */}
      {profile?.feeDue ? (
        <View style={s.feeBanner}>
          <View style={{ flex: 1 }}>
            <AppText variant="body" weight="600" color={C.error}>Fee Due</AppText>
            <AppText variant="caption" color={C.text2} style={{ marginTop: 2 }}>
              You have an outstanding fee for this month.
            </AppText>
          </View>
          {profile.paymentLink ? (
            <AppText variant="caption" color={C.error} weight="600">Pay Now</AppText>
          ) : (
            <AppText variant="caption" color={C.text2}>Contact institute</AppText>
          )}
        </View>
      ) : null}

      {/* Attendance Summary Card */}
      <AppCard style={s.summaryCard}>
        <AppText variant="micro" color={C.text2} weight="600" style={s.sectionLabel}>
          ATTENDANCE THIS MONTH
        </AppText>
        <AppText variant="hero" color={pctColor}>{attendancePct}%</AppText>
        <AppText variant="caption" color={C.text2} style={{ marginTop: spacing.xs }}>
          {attendance?.present ?? 0} present out of {attendance?.total ?? 0} sessions
        </AppText>
      </AppCard>

      {/* Today's Classes */}
      <View style={{ marginBottom: spacing.xl }}>
        <AppText variant="subheading" style={{ marginBottom: spacing.md }}>Today's classes</AppText>
        {schedule.length === 0 ? (
          <EmptyState compact icon="📭" title="No classes scheduled today" message="Enjoy your day off." />
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

      {/* Upcoming Events */}
      <View style={{ marginBottom: spacing.xl }}>
        <AppText variant="subheading" style={{ marginBottom: spacing.md }}>Upcoming</AppText>
        {upcomingEvents.length === 0 ? (
          <EmptyState compact icon="🗓️" title="No upcoming classes" message="New sessions will show up here." />
        ) : (
          upcomingEvents.slice(0, 5).map((e, idx) => (
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
