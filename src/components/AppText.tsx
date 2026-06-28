import React from 'react';
import { Text, TextStyle } from 'react-native';
import C from '../constants/colors';

interface AppTextProps {
  children: React.ReactNode;
  size?: number;
  weight?: TextStyle['fontWeight'];
  color?: string;
  style?: TextStyle;
  numberOfLines?: number;
}

export function AppText({
  children,
  size = 14,
  weight = '400',
  color = C.text,
  style,
  numberOfLines,
}: AppTextProps) {
  return (
    <Text
      style={[{ fontSize: size, fontWeight: weight, color, fontFamily: 'DMSans_400Regular' }, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}
