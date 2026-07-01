import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle, GestureResponderEvent } from 'react-native';
import { haptics } from '../lib/haptics';

interface TouchableProps extends Omit<PressableProps, 'style'> {
  /** Opacity applied while the press is active. */
  pressedOpacity?: number;
  /** Fire a light haptic tap on press. Off by default — opt in for key actions. */
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Drop-in replacement for `Pressable` that gives every tap a visible response
 * (the app previously had many dead-feeling Pressables — audit G3). Dims to
 * `pressedOpacity` while held and can fire a subtle haptic on key actions.
 */
export function Touchable({
  pressedOpacity = 0.6,
  haptic = false,
  style,
  onPress,
  children,
  ...rest
}: TouchableProps) {
  const handlePress = (e: GestureResponderEvent) => {
    if (haptic) haptics.tap();
    onPress?.(e);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [style, pressed && { opacity: pressedOpacity }]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
