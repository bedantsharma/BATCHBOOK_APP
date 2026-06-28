import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import C, { radius } from '../constants/colors';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: AppButtonProps) {
  const bg =
    variant === 'primary' ? C.primary : variant === 'secondary' ? C.surface2 : 'transparent';
  const textColor = variant === 'primary' ? '#000' : C.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, opacity: pressed || disabled ? 0.7 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'DMSans_600SemiBold',
  },
});
