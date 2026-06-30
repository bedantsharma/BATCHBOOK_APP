import { TextStyle } from 'react-native';

type Variant = {
  size: number;
  lineHeight: number;
  weight: TextStyle['fontWeight'];
};

export const typography = {
  hero: { size: 40, lineHeight: 48, weight: '700' },
  display: { size: 32, lineHeight: 40, weight: '700' },
  title: { size: 26, lineHeight: 32, weight: '700' },
  heading: { size: 20, lineHeight: 26, weight: '600' },
  subheading: { size: 16, lineHeight: 22, weight: '600' },
  body: { size: 14, lineHeight: 20, weight: '400' },
  caption: { size: 12, lineHeight: 16, weight: '400' },
  micro: { size: 11, lineHeight: 14, weight: '400' },
} satisfies Record<string, Variant>;

export type TypographyVariant = keyof typeof typography;

export default typography;
