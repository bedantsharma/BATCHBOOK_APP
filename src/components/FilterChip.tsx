import React from 'react';
import { StyleSheet } from 'react-native';
import { Touchable } from './Touchable';
import { AppText } from './AppText';
import C, { radius } from '../constants/colors';
import { spacing } from '../constants/spacing';

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function FilterChip({ label, active, onPress }: FilterChipProps) {
  return (
    <Touchable haptic onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <AppText
        variant="caption"
        color={active ? C.onPrimary : C.text}
        weight={active ? '600' : '400'}
      >
        {label}
      </AppText>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    backgroundColor: C.surface2,
    borderRadius: radius.lg,
  },
  chipActive: { backgroundColor: C.primary },
});
