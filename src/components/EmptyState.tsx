import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { AppButton } from './AppButton';
import C from '../constants/colors';
import { spacing } from '../constants/spacing';

interface EmptyStateProps {
  icon: string;
  title: string;
  message?: string;
  /** Optional first-action button (only shown when both provided). */
  actionLabel?: string;
  onAction?: () => void;
  /** Compact inline variant for section-level empties (smaller icon, left-aligned, no big top pad). */
  compact?: boolean;
}

/**
 * Designed empty state. Full variant: centered icon + title + copy (+ optional first
 * action). Compact variant: a smaller inline block for empty sections inside a screen.
 */
export function EmptyState({ icon, title, message, actionLabel, onAction, compact }: EmptyStateProps) {
  if (compact) {
    return (
      <View style={styles.compact}>
        <AppText size={22}>{icon}</AppText>
        <View style={{ flex: 1 }}>
          <AppText variant="body" color={C.text2}>{title}</AppText>
          {!!message && (
            <AppText variant="caption" color={C.text3} style={{ marginTop: 2 }}>{message}</AppText>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.full}>
      <AppText size={36}>{icon}</AppText>
      <AppText variant="subheading" style={{ marginTop: spacing.md }}>{title}</AppText>
      {!!message && (
        <AppText variant="body" color={C.text2} style={styles.message}>{message}</AppText>
      )}
      {actionLabel && onAction && (
        <AppButton label={actionLabel} onPress={onAction} variant="secondary" style={styles.btn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  full: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  message: { marginTop: spacing.xs, textAlign: 'center' },
  btn: { marginTop: spacing.lg, minWidth: 160 },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});

export default EmptyState;
