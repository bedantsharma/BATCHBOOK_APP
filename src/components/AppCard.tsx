import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import C, { radius } from '../constants/colors';

interface AppCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function AppCard({ children, style }: AppCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: radius.lg,
    padding: 16,
  },
});
