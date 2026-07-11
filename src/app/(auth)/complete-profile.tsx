import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { AppText } from '../../components/AppText';
import C from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import api from '../../services/api';

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { childId, missingParentName, missingChildEmail } = useLocalSearchParams<{
    childId: string;
    missingParentName: string;
    missingChildEmail: string;
  }>();
  const needsParentName = missingParentName === '1';
  const needsChildEmail = missingChildEmail === '1';

  const [parentName, setParentName] = useState('');
  const [childEmail, setChildEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit =
    (!needsParentName || parentName.trim().length > 0) &&
    (!needsChildEmail || childEmail.trim().length > 0);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      if (needsParentName) {
        await api.patch('/parent/update', { name: parentName.trim() });
      }
      if (needsChildEmail) {
        await api.patch(`/parent/children/${childId}`, { email: childEmail.trim() });
      }
      router.replace('/(student)/home' as any);
    } catch {
      setError('Could not save your details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <AppText variant="title" style={styles.title}>Just one more thing</AppText>
        <AppText variant="body" color={C.text2} style={styles.subtitle}>
          A couple of details are still missing from your profile.
        </AppText>
        <View style={styles.form}>
          {needsParentName && (
            <AppInput
              label="Your Name"
              placeholder="Full name"
              value={parentName}
              onChangeText={setParentName}
              autoFocus
            />
          )}
          {needsChildEmail && (
            <AppInput
              label="Child's Email"
              placeholder="name@example.com"
              value={childEmail}
              onChangeText={setChildEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}
          {error ? <AppText variant="caption" color={C.error}>{error}</AppText> : null}
          <AppButton
            label="Continue"
            onPress={handleSubmit}
            loading={loading}
            disabled={!canSubmit || loading}
            style={styles.continueBtn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  title: { letterSpacing: -0.5, marginBottom: spacing.sm },
  subtitle: { lineHeight: 20, marginBottom: spacing.xxl },
  form: { gap: spacing.xl },
  continueBtn: { marginTop: spacing.sm },
});
