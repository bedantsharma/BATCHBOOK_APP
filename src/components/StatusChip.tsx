import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { AppText } from './AppText';
import { radius, withOpacity } from '../constants/colors';
import type { TypographyVariant } from '../constants/typography';

interface StatusChipProps {
  label: string;
  color: string;
  variant?: Extract<TypographyVariant, 'micro' | 'caption'>;
  style?: StyleProp<ViewStyle>;
}

export function StatusChip({ label, color, variant = 'micro', style }: StatusChipProps) {
  return (
    <View
      style={[
        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm },
        { backgroundColor: withOpacity(color) },
        style,
      ]}
    >
      <AppText variant={variant} weight="600" color={color}>
        {label}
      </AppText>
    </View>
  );
}
