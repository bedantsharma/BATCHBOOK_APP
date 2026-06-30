import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import C from '../constants/colors';

interface AnimatedProgressBarProps {
  /** 0..1. The fill animates whenever this changes (and fills in on mount). */
  progress: number;
  height?: number;
  color?: string;
  trackColor?: string;
  /** Pill ends (defaults on). */
  rounded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A progress bar whose fill animates to its target width (audit G3 — the old
 * flex-based bars snapped instantly). Used for batch capacity + onboarding steps.
 */
export function AnimatedProgressBar({
  progress,
  height = 4,
  color = C.primary,
  trackColor = C.surface2,
  rounded = true,
  style,
}: AnimatedProgressBarProps) {
  const clamped = Math.max(0, Math.min(progress, 1));
  const w = useSharedValue(0);

  useEffect(() => {
    w.value = withTiming(clamped, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, [clamped, w]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  const r = rounded ? height / 2 : 0;

  return (
    <View style={[{ height, backgroundColor: trackColor, borderRadius: r, overflow: 'hidden' }, style]}>
      <Animated.View style={[{ height, backgroundColor: color, borderRadius: r }, fillStyle]} />
    </View>
  );
}
