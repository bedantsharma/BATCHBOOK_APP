import React from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogoMark } from '../../components/LogoMark';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { AppText } from '../../components/AppText';
import C, { radius } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

const FEATURES = [
  { icon: '📚', title: 'Batch Management', desc: 'Organise students into batches with custom schedules' },
  { icon: '💰', title: 'Fee Tracking', desc: 'Track monthly fees, send reminders, mark payments' },
  { icon: '✅', title: 'Attendance', desc: 'Mark and review attendance session by session' },
  { icon: '📊', title: 'Test Scores', desc: 'Record scores and track student progress over time' },
];

export default function LandingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <LogoMark size={64} />
          <AppText variant="display" style={styles.appName}>BatchBook</AppText>
          <AppText variant="subheading" weight="400" color={C.text2} style={styles.tagline}>
            The smart way to manage your tuition classes
          </AppText>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <AppCard key={f.title} style={styles.featureCard}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={styles.featureText}>
                <AppText variant="subheading">{f.title}</AppText>
                <AppText variant="caption" color={C.text2} style={{ marginTop: 2 }}>{f.desc}</AppText>
              </View>
            </AppCard>
          ))}
        </View>

        {/* CTAs */}
        <View style={styles.ctas}>
          <AppButton
            label="I'm a Tutor →"
            onPress={() => router.push('/(auth)/phone-login' as any)}
            variant="primary"
            style={styles.ctaBtn}
          />
          <AppButton
            label="I'm a Student"
            onPress={() => router.push({ pathname: '/(auth)/onboarding', params: { role: 'student' } } as any)}
            variant="secondary"
            style={styles.ctaBtn}
          />
        </View>

        {/* Footer */}
        <AppText variant="caption" color={C.text3} style={styles.footer}>
          By continuing you agree to our Privacy Policy
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  hero: { alignItems: 'center', paddingTop: 48, paddingBottom: spacing.xxl, gap: spacing.md },
  appName: { letterSpacing: -0.5 },
  tagline: { textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  features: { gap: spacing.md, marginBottom: spacing.xxl },
  featureCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  featureIcon: { fontSize: 24, marginTop: 2 },
  featureText: { flex: 1 },
  ctas: { gap: spacing.md, marginBottom: spacing.xl },
  ctaBtn: { width: '100%' },
  footer: { textAlign: 'center', marginTop: spacing.sm },
});
