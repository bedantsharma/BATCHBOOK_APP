import React, { useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import C, { radius } from '../constants/colors';

interface OtpInputProps {
  value: string;
  onChange: (val: string) => void;
  length?: number;
}

export function OtpInput({ value, onChange, length = 6 }: OtpInputProps) {
  const refs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, idx: number) => {
    const digits = value.split('');
    digits[idx] = text.slice(-1);
    const next = digits.join('');
    onChange(next);
    if (text && idx < length - 1) refs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    idx: number
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !value[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, i) => (
        <TextInput
          key={i}
          ref={(r) => {
            refs.current[i] = r;
          }}
          style={styles.cell}
          keyboardType="number-pad"
          maxLength={1}
          value={value[i] || ''}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  cell: {
    width: 46,
    height: 56,
    backgroundColor: C.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: C.outline,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: C.text,
  },
});
