import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { AppButton } from './AppButton';
import C from '../constants/colors';
import { spacing } from '../constants/spacing';

interface ErrorRetryProps {
  title?: string;
  message?: string;
  onRetry: () => void;
}

/**
 * Inline "couldn't load — retry" state. Use where a load failure would otherwise
 * leave a blank/empty screen and rely only on the global error toast.
 */
export function ErrorRetry({
  title = "Couldn't load",
  message = 'Something went wrong. Check your connection and try again.',
  onRetry,
}: ErrorRetryProps) {
  return (
    <View style={styles.wrap}>
      <AppText size={36}>⚠️</AppText>
      <AppText variant="subheading" style={{ marginTop: spacing.md }}>
        {title}
      </AppText>
      <AppText variant="body" color={C.text2} style={styles.message}>
        {message}
      </AppText>
      <AppButton label="Retry" onPress={onRetry} variant="secondary" style={styles.btn} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  message: { marginTop: spacing.xs, textAlign: 'center' },
  btn: { marginTop: spacing.lg, minWidth: 140 },
});

export default ErrorRetry;
