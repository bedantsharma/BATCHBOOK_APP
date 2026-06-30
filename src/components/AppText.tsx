import React from 'react';
import { Text, TextStyle } from 'react-native';
import C from '../constants/colors';
import typography, { TypographyVariant } from '../constants/typography';

const FONT_FAMILY_BY_WEIGHT: Record<string, string> = {
  '400': 'DMSans_400Regular',
  '500': 'DMSans_500Medium',
  '600': 'DMSans_600SemiBold',
  '700': 'DMSans_700Bold',
};

interface AppTextProps {
  children: React.ReactNode;
  variant?: TypographyVariant;
  size?: number;
  weight?: TextStyle['fontWeight'];
  color?: string;
  style?: TextStyle;
  numberOfLines?: number;
}

export function AppText({
  children,
  variant,
  size,
  weight,
  color = C.text,
  style,
  numberOfLines,
}: AppTextProps) {
  const preset = variant ? typography[variant] : undefined;
  const resolvedSize = size ?? preset?.size ?? 14;
  const resolvedWeight = weight ?? preset?.weight ?? '400';
  const fontFamily = FONT_FAMILY_BY_WEIGHT[String(resolvedWeight)] ?? FONT_FAMILY_BY_WEIGHT['400'];
  return (
    <Text
      style={[
        {
          fontSize: resolvedSize,
          lineHeight: preset?.lineHeight,
          fontWeight: resolvedWeight,
          color,
          fontFamily,
        },
        style,
      ]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}
