import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import C, { radius } from '../constants/colors';
import { spacing } from '../constants/spacing';

// ── Primitive: a single shimmering block ──────────────────────────────────────

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 12, borderRadius = radius.sm, style }: SkeletonProps) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: C.surface3 }, animatedStyle, style]}
    />
  );
}

// ── Card-shaped skeleton row (mirrors the owner list cards) ───────────────────

function CardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Skeleton width="55%" height={16} />
          <Skeleton width="35%" height={12} />
        </View>
        <Skeleton width={64} height={22} borderRadius={radius.sm} />
      </View>
      <Skeleton width="45%" height={12} style={{ marginTop: spacing.md }} />
    </View>
  );
}

interface SkeletonListProps {
  count?: number;
}

export function SkeletonList({ count = 4 }: SkeletonListProps) {
  return (
    <View style={styles.list} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, gap: spacing.md },
  card: { backgroundColor: C.surface, borderRadius: radius.lg, padding: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
});

export default Skeleton;
