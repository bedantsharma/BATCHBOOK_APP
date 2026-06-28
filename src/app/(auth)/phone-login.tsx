import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { AppText } from '../../components/AppText';
import { LogoMark } from '../../components/LogoMark';
import C from '../../constants/colors';
import api from '../../services/api';

export default function PhoneLoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (val: string) => /^\d{10}$/.test(val);

  const handleSubmit = async () => {
    if (!validate(phone)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/owner/generate_otp', { phone });
      router.push({ pathname: '/(auth)/otp-verification', params: { phone } } as any);
    } catch {
      // api interceptor already shows toast for non-401 errors
      setError('Could not send OTP. Please try again.');
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
          {/* Back */}
          <Pressable onPress={() => router.back()} style={styles.back}>
            <AppText size={14} color={C.primary}>← Back</AppText>
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <LogoMark size={48} />
            <AppText size={26} weight="700" style={styles.title}>Tutor Login</AppText>
            <AppText size={14} color={C.text2} style={styles.subtitle}>
              We'll send a 6-digit OTP to your mobile number
            </AppText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <AppInput
              label="Mobile Number"
              placeholder="10-digit number"
              value={phone}
              onChangeText={(t) => {
                setPhone(t.replace(/\D/g, '').slice(0, 10));
                setError('');
              }}
              keyboardType="phone-pad"
              maxLength={10}
              error={error}
              autoFocus
            />
            <AppButton
              label="Send OTP"
              onPress={handleSubmit}
              loading={loading}
              disabled={phone.length !== 10}
              style={styles.submitBtn}
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
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  back: { alignSelf: 'flex-start', paddingVertical: 8 },
  header: { alignItems: 'center', gap: 12, marginTop: 24, marginBottom: 40 },
  title: { letterSpacing: -0.5 },
  subtitle: { textAlign: 'center', lineHeight: 20 },
  form: { gap: 20 },
  submitBtn: { marginTop: 8 },
});
