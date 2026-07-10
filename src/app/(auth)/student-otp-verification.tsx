import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { AppText } from '../../components/AppText';
import { LogoMark } from '../../components/LogoMark';
import C from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import api from '../../services/api';
import { supabase } from '../../lib/supabaseClient';

interface ChildSummary {
  id: number;
  name: string | null;
  fees_status: string;
}

export default function StudentOtpVerificationScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [resending, setResending] = useState(false);

  // Countdown timer: tick every second until it hits 0
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const verify = useCallback(
    async (code: string) => {
      if (code.length !== 6) return;
      setError('');
      setLoading(true);
      try {
        const { data } = await api.post('/parent/verify_otp', { token: code, phone });
        const children: ChildSummary[] = data.children ?? [];

        if (children.length === 0) {
          setError('No student profile found for this number. Ask your tutor to add you first.');
          setOtp('');
          return;
        }

        // Bridge backend JWT into the Supabase JS client
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.auth_token,
          refresh_token: data.refresh_token,
        });
        if (sessionError) throw sessionError;

        // Stamp student role + active child for route guard and dashboard data
        await AsyncStorage.setItem('bb_role', 'student');
        await AsyncStorage.setItem('bb_student_id', String(children[0].id));
        await AsyncStorage.setItem('bb_student_name', children[0].name ?? '');

        router.replace('/(student)/home' as any);
      } catch {
        setError('Invalid OTP. Please try again.');
        setOtp('');
      } finally {
        setLoading(false);
      }
    },
    [phone, router]
  );

  const handleOtpChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    setError('');
    if (digits.length === 6) verify(digits);
  };

  const handleResend = async () => {
    setResending(true);
    setOtp('');
    setError('');
    try {
      await api.post('/parent/generate_otp', { phone });
      setCountdown(60);
    } catch {
      // toast shown by api interceptor
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Back */}
        <Pressable onPress={() => router.back()} style={styles.back}>
          <AppText variant="body" color={C.primary}>← Back</AppText>
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <LogoMark size={48} />
          <AppText variant="title" style={styles.title}>Enter OTP</AppText>
          <AppText variant="body" color={C.text2} style={styles.subtitle}>
            Sent to +91 {phone}
          </AppText>
        </View>

        {/* OTP Input */}
        <View style={styles.otpSection}>
          <AppInput
            label="6-digit OTP"
            placeholder="Enter OTP"
            value={otp}
            onChangeText={handleOtpChange}
            keyboardType="number-pad"
            maxLength={6}
            error={error}
            autoFocus
            textContentType="oneTimeCode"
            style={styles.otpInput}
          />
        </View>

        {/* Verify Button */}
        <AppButton
          label="Verify OTP"
          onPress={() => verify(otp)}
          loading={loading}
          disabled={otp.length !== 6 || loading}
          style={styles.verifyBtn}
        />

        {/* Resend */}
        <View style={styles.resendRow}>
          {countdown > 0 ? (
            <AppText variant="body" color={C.text2}>Resend OTP in {countdown}s</AppText>
          ) : (
            <Pressable onPress={handleResend} disabled={resending}>
              <AppText variant="body" color={resending ? C.text2 : C.primary}>
                {resending ? 'Sending...' : 'Resend OTP'}
              </AppText>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  back: { alignSelf: 'flex-start', paddingVertical: spacing.sm },
  header: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xl, marginBottom: spacing.xxxl },
  title: { letterSpacing: -0.5 },
  subtitle: { textAlign: 'center' },
  otpSection: { marginBottom: spacing.xxl },
  otpInput: { textAlign: 'center', fontSize: 22, letterSpacing: 8 },
  verifyBtn: { marginBottom: spacing.xl },
  resendRow: { alignItems: 'center' },
});
