import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import C, { radius } from '../../constants/colors';

type Role = 'owner' | 'student' | null;

interface Profile {
  role: Role;
  name: string;
  parentName: string;
  parentPhone: string;
}

const TOTAL_STEPS = 3;

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Profile>({
    role: null,
    name: '',
    parentName: '',
    parentPhone: '',
  });
  const [loading, setLoading] = useState(false);

  const progress = step / TOTAL_STEPS;

  const handleRoleSelect = (role: Role) => {
    setProfile(p => ({ ...p, role }));
    setStep(2);
  };

  const handleContinue = async () => {
    if (step === 2) {
      setStep(3);
      return;
    }
    if (step === 3) {
      setLoading(true);
      try {
        await AsyncStorage.setItem('onboarding_profile', JSON.stringify(profile));
        if (profile.role === 'owner') {
          router.replace('/(auth)/phone-login' as any);
        }
        // student stays on step 3 — shows "ask for join link" message
      } finally {
        setLoading(false);
      }
    }
  };

  const canContinue = () => {
    if (step === 2 && profile.role === 'owner') return profile.name.trim().length > 0;
    if (step === 2 && profile.role === 'student') {
      return profile.name.trim().length > 0 && profile.parentPhone.trim().length === 10;
    }
    return true;
  };

  const ownerCardStyle = profile.role === 'owner'
    ? { ...styles.roleCard, ...styles.roleCardActive }
    : styles.roleCard;

  const studentCardStyle = profile.role === 'student'
    ? { ...styles.roleCard, ...styles.roleCardActive }
    : styles.roleCard;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Progress Bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { flex: progress }]} />
        <View style={{ flex: 1 - progress }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Back */}
        {step > 1 && (
          <Pressable onPress={() => setStep(s => s - 1)} style={styles.back}>
            <AppText size={14} color={C.primary}>← Back</AppText>
          </Pressable>
        )}

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <AppText size={26} weight="700" style={styles.stepTitle}>Who are you?</AppText>
            <AppText size={14} color={C.text2} style={styles.stepSubtitle}>
              This helps us personalise your experience
            </AppText>
            <View style={styles.roleCards}>
              <Pressable onPress={() => handleRoleSelect('owner')} style={styles.roleCardWrapper}>
                <AppCard style={ownerCardStyle}>
                  <AppText size={32}>👨‍🏫</AppText>
                  <AppText size={17} weight="600" style={styles.roleCardLabel}>I'm a Tutor</AppText>
                  <AppText size={13} color={C.text2} style={styles.roleCardDesc}>
                    Manage batches, fees, and students
                  </AppText>
                </AppCard>
              </Pressable>
              <Pressable onPress={() => handleRoleSelect('student')} style={styles.roleCardWrapper}>
                <AppCard style={studentCardStyle}>
                  <AppText size={32}>🎓</AppText>
                  <AppText size={17} weight="600" style={styles.roleCardLabel}>I'm a Student</AppText>
                  <AppText size={13} color={C.text2} style={styles.roleCardDesc}>
                    View schedule, fees, and attendance
                  </AppText>
                </AppCard>
              </Pressable>
            </View>
          </View>
        )}

        {/* Step 2: Profile Details */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <AppText size={26} weight="700" style={styles.stepTitle}>Your details</AppText>
            <AppText size={14} color={C.text2} style={styles.stepSubtitle}>
              {profile.role === 'owner' ? 'Tell us your name' : 'Tell us about the student'}
            </AppText>
            <View style={styles.form}>
              <AppInput
                label={profile.role === 'owner' ? 'Your Name' : 'Student Name'}
                placeholder="Full name"
                value={profile.name}
                onChangeText={name => setProfile(p => ({ ...p, name }))}
                autoFocus
              />
              {profile.role === 'student' && (
                <>
                  <AppInput
                    label="Parent / Guardian Name"
                    placeholder="Full name"
                    value={profile.parentName}
                    onChangeText={parentName => setProfile(p => ({ ...p, parentName }))}
                  />
                  <AppInput
                    label="Parent Mobile Number"
                    placeholder="10-digit number"
                    value={profile.parentPhone}
                    onChangeText={t => setProfile(p => ({ ...p, parentPhone: t.replace(/\D/g, '').slice(0, 10) }))}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </>
              )}
              <AppButton
                label="Continue"
                onPress={handleContinue}
                disabled={!canContinue()}
                style={styles.continueBtn}
              />
            </View>
          </View>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            {profile.role === 'owner' ? (
              <>
                <AppText size={26} weight="700" style={styles.stepTitle}>Almost there!</AppText>
                <AppText size={14} color={C.text2} style={styles.stepSubtitle}>
                  Login with your mobile number to continue
                </AppText>
                <AppButton
                  label="Continue to Login →"
                  onPress={handleContinue}
                  loading={loading}
                  style={styles.doneBtn}
                />
              </>
            ) : (
              <>
                <AppText size={32} style={styles.joinIcon}>🔗</AppText>
                <AppText size={26} weight="700" style={styles.stepTitle}>Ask your tutor</AppText>
                <AppText size={14} color={C.text2} style={styles.joinSubtitle}>
                  Ask your tutor to send you a BatchBook join link. It looks like:
                </AppText>
                <View style={styles.joinCodeBox}>
                  <Text style={styles.joinCodeText}>batchbook://join/ABC123</Text>
                </View>
                <AppButton
                  label="Done"
                  onPress={() => router.replace('/(auth)/landing' as any)}
                  variant="secondary"
                  style={styles.doneBtn}
                />
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  progressTrack: {
    height: 3,
    flexDirection: 'row',
    backgroundColor: C.surface2,
  },
  progressFill: { backgroundColor: C.primary },
  scroll: { paddingHorizontal: 24, paddingBottom: 48, flexGrow: 1 },
  back: { alignSelf: 'flex-start', paddingVertical: 12 },
  stepContainer: { paddingTop: 32 },
  stepTitle: { letterSpacing: -0.5, marginBottom: 8 },
  stepSubtitle: { lineHeight: 20, marginBottom: 32 },
  roleCards: { gap: 16 },
  roleCardWrapper: {},
  roleCard: { alignItems: 'center', paddingVertical: 24 },
  roleCardActive: { borderWidth: 2, borderColor: C.primary },
  roleCardLabel: { marginTop: 12 },
  roleCardDesc: { marginTop: 4, textAlign: 'center' },
  form: { gap: 20 },
  continueBtn: { marginTop: 8 },
  doneBtn: { marginTop: 32 },
  joinIcon: { textAlign: 'center', marginBottom: 16 },
  joinSubtitle: { lineHeight: 20, marginBottom: 20 },
  joinCodeBox: {
    backgroundColor: C.surface2,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 32,
    alignItems: 'center',
  },
  joinCodeText: {
    fontSize: 13,
    color: C.primary,
    fontWeight: '600',
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 0.5,
  },
});
