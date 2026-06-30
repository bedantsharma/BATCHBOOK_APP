import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Touchable } from './Touchable';
import { AppText } from './AppText';
import { AppButton } from './AppButton';
import C, { radius } from '../constants/colors';
import { spacing } from '../constants/spacing';

type Mode = 'date' | 'time';

interface DateTimeFieldProps {
  label?: string;
  /** 'YYYY-MM-DD' when mode='date', 'HH:MM' when mode='time'. */
  value: string;
  mode: Mode;
  onChange: (value: string) => void;
  error?: string;
}

// ── string <-> Date helpers (kept here so callers keep their string state) ────

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function parse(value: string, mode: Mode): Date {
  if (mode === 'date') {
    const d = new Date(`${value}T00:00:00`);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  const [h, m] = value.split(':').map(Number);
  const d = new Date();
  if (!isNaN(h) && !isNaN(m)) d.setHours(h, m, 0, 0);
  return d;
}

function format(d: Date, mode: Mode): string {
  if (mode === 'date') {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function display(value: string, mode: Mode): string {
  if (!value) return mode === 'date' ? 'Select date' : 'Select time';
  if (mode === 'time') return value;
  const d = parse(value, mode);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function DateTimeField({ label, value, mode, onChange, error }: DateTimeFieldProps) {
  const [show, setShow] = useState(false);
  // iOS spinner edits a draft and commits on "Done"; Android commits immediately.
  const [draft, setDraft] = useState<Date>(() => parse(value, mode));

  const open = () => {
    setDraft(parse(value, mode));
    setShow(true);
  };

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (event.type === 'set' && selected) onChange(format(selected, mode));
      return;
    }
    if (selected) setDraft(selected);
  };

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Touchable
        onPress={open}
        style={[styles.field, error ? styles.fieldError : undefined]}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? mode}: ${display(value, mode)}`}
      >
        <AppText variant="body" color={value ? C.text : C.text3}>
          {display(value, mode)}
        </AppText>
        <Text style={styles.icon}>{mode === 'date' ? '📅' : '🕐'}</Text>
      </Touchable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Android: bare picker acts as a dialog. */}
      {show && Platform.OS === 'android' && (
        <DateTimePicker value={draft} mode={mode} onChange={onPickerChange} />
      )}

      {/* iOS: spinner inside a bottom sheet with a Done button. */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
          <Touchable style={styles.backdrop} onPress={() => setShow(false)} pressedOpacity={1}>
            <View />
          </Touchable>
          <View style={styles.sheet}>
            <DateTimePicker
              value={draft}
              mode={mode}
              display="spinner"
              themeVariant="dark"
              textColor={C.text}
              onChange={onPickerChange}
              style={styles.iosPicker}
            />
            <AppButton
              label="Done"
              onPress={() => {
                onChange(format(draft, mode));
                setShow(false);
              }}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 13, color: C.text2, fontWeight: '500' },
  field: {
    height: 48,
    backgroundColor: C.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.outline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldError: { borderColor: C.error },
  icon: { fontSize: 16 },
  error: { fontSize: 12, color: C.error },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  iosPicker: { alignSelf: 'center' },
});

export default DateTimeField;
