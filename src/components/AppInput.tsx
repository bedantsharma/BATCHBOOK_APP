import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import C, { radius } from '../constants/colors';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

type FocusHandler = NonNullable<TextInputProps['onFocus']>;
type BlurHandler = NonNullable<TextInputProps['onBlur']>;

export function AppInput({ label, error, style, onFocus, onBlur, ...props }: AppInputProps) {
  const [focused, setFocused] = useState(false);

  const handleFocus: FocusHandler = (e) => {
    setFocused(true);
    onFocus?.(e);
  };
  const handleBlur: BlurHandler = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          focused ? styles.inputFocused : undefined,
          error ? styles.inputError : undefined,
          style as object,
        ]}
        placeholderTextColor={C.text3}
        onFocus={handleFocus}
        onBlur={handleBlur}
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
    minHeight: 48,
    backgroundColor: C.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
    borderWidth: 1,
    borderColor: C.outline,
  },
  inputFocused: { borderColor: C.primary },
  inputError: { borderColor: C.error },
  error: { fontSize: 12, color: C.error },
});
