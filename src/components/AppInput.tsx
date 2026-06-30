import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import C, { radius } from '../constants/colors';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function AppInput({ label, error, style, ...props }: AppInputProps) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, error ? styles.inputError : undefined, style as object]}
        placeholderTextColor={C.text3}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 13, color: C.text2, fontWeight: '500' },
  input: {
    height: 48,
    backgroundColor: C.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontSize: 15,
    color: C.text,
    borderWidth: 1,
    borderColor: C.outline,
  },
  inputError: { borderColor: C.error },
  error: { fontSize: 12, color: C.error },
});
