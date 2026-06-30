import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import C from '../constants/colors';
import { spacing } from '../constants/spacing';
import { useStudentData } from '../context/StudentDataContext';

/**
 * Shared chrome for every student tab: the "BatchBook / Student" top bar plus a
 * scroll container with pull-to-refresh wired to the shared dashboard refresh.
 * Pass `scroll={false}` for screens that manage their own scrolling/empty layout.
 */
export function StudentScreen({
  children,
  scroll = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const { refreshing, refresh } = useStudentData();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <AppText variant="subheading">BatchBook</AppText>
        <AppText variant="micro" color={C.text2}>Student</AppText>
      </View>

      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.primary} />
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: C.outline,
    backgroundColor: C.bg,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
});

export default StudentScreen;
