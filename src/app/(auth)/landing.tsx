import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { LinearTransition } from 'react-native-reanimated';
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

const SCREEN_PADDING = spacing.xl;

export default function LandingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const pageWidth = width - SCREEN_PADDING * 2;
  const [active, setActive] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (index !== active) setActive(index);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Hero */}
        <View style={styles.hero}>
          <LogoMark size={56} />
          <AppText variant="display" style={styles.appName}>BatchBook</AppText>
          <AppText variant="subheading" weight="400" color={C.text2} style={styles.tagline}>
            The smart way to manage your tuition classes
          </AppText>
        </View>

        {/* CTAs — always above the fold */}
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

        {/* Highlight strip — one feature at a time, manual swipe */}
        <View style={styles.strip}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
          >
            {FEATURES.map((f) => (
              <View key={f.title} style={{ width: pageWidth }}>
                <AppCard style={styles.featureCard}>
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                  <View style={styles.featureText}>
                    <AppText variant="subheading">{f.title}</AppText>
                    <AppText variant="caption" color={C.text2} style={{ marginTop: 2 }}>
                      {f.desc}
                    </AppText>
                  </View>
                </AppCard>
              </View>
            ))}
          </ScrollView>

          {/* Page dots */}
          <View style={styles.dots}>
            {FEATURES.map((f, i) => (
              <Animated.View
                key={f.title}
                layout={LinearTransition.duration(200)}
                style={[styles.dot, i === active && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        {/* Footer */}
        <AppText variant="caption" color={C.text3} style={styles.footer}>
          By continuing you agree to our Privacy Policy
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xl },
  hero: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  appName: { letterSpacing: -0.5 },
  tagline: { textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  ctas: { gap: spacing.md, paddingTop: spacing.xxl },
  ctaBtn: { width: '100%' },
  strip: { marginTop: 'auto' },
  featureCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIcon: { fontSize: 24 },
  featureText: { flex: 1 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.outline },
  dotActive: { width: 20, backgroundColor: C.primary },
  footer: { textAlign: 'center', marginTop: spacing.xl },
});
