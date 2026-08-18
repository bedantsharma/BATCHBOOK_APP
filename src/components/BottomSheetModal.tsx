import React, { useEffect } from 'react';
import { StyleSheet, Platform, BackHandler, ScrollView } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import C, { radius } from '../constants/colors';
import { spacing } from '../constants/spacing';

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheetModal({ visible, onClose, children }: BottomSheetModalProps) {
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      style={[StyleSheet.absoluteFill, styles.overlay]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Bottom-anchored sheet, capped below screen height so long forms
          (e.g. Add Score's 5 fields) can never overflow past the top of the
          screen with no way to reach them — see BottomSheetModal keyboard/
          scroll gotcha in CLAUDE.md.

          maxHeight lives on the ScrollView's own `style` (its outer frame),
          not on a wrapping View: a plain View auto-sizes to its content, but
          ScrollView does not — without an explicit height/maxHeight on the
          ScrollView itself, its frame collapses instead of growing with
          content, which is what made the sheet render tiny and off-center
          the first time this was tried. `style` (frame) gets the sizing/
          chrome, `contentContainerStyle` (the scrollable content) gets the
          padding — this lets the sheet shrink-wrap short forms and only
          engage scrolling once content actually exceeds the cap. */}
      <ScrollView
        style={styles.sheet}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.sheetContent}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    maxHeight: '88%',
    flexGrow: 0,
    backgroundColor: C.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  sheetContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
});
