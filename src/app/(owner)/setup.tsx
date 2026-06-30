import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { AppText } from '../../components/AppText';
import { LogoMark } from '../../components/LogoMark';
import C from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import api from '../../services/api';

export default function OwnerSetupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Institute name is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/owner/institute', { name: name.trim(), city: city.trim() });
      router.replace('/(owner)/batches' as any);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        router.replace('/(owner)/batches' as any);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <LogoMark size={48} />
            <AppText variant="title" style={styles.title}>Set up your institute</AppText>
            <AppText variant="body" color={C.text2} style={styles.subtitle}>
              This is how students and parents will recognise you
            </AppText>
          </View>

          <View style={styles.form}>
            <AppInput
              label="Institute Name"
              placeholder="e.g. Sharma Classes"
              value={name}
              onChangeText={t => { setName(t); setError(''); }}
              error={error}
              autoFocus
            />
            <AppInput
              label="City"
              placeholder="e.g. Mumbai"
              value={city}
              onChangeText={setCity}
            />
            <AppButton
              label="Get Started →"
              onPress={handleSubmit}
              loading={loading}
              disabled={!name.trim()}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  kav: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  header: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xxl, marginBottom: spacing.xxxl },
  title: { letterSpacing: -0.5, textAlign: 'center' },
  subtitle: { textAlign: 'center', lineHeight: 20 },
  form: { gap: spacing.xl },
});
