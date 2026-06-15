/**
 * Delte designtokens for Pestulus. Mørkt tema som standard (kun mørk palett, jf.
 * docs/skadedyr-app-spesifikasjon.md §9): dempet koksgrå + én ravgul aksentfarge.
 * All UI (Scan, Oversikt, History, faner, glass-paneler) skal bygge på disse.
 */

import { Platform } from 'react-native';

export const Colors = {
  background: '#15171A',
  surface: '#1F2226',
  surfaceAlt: '#26292E',
  border: 'rgba(255, 255, 255, 0.08)',
  overlay: 'rgba(10, 11, 13, 0.55)',

  text: '#ECEDEE',
  textSecondary: '#9BA1A6',
  textMuted: '#6B7076',

  accent: '#C9A24B',
  accentMuted: 'rgba(201, 162, 75, 0.18)',
  accentText: '#1A1605',

  danger: '#C1654F',
  dangerMuted: 'rgba(193, 101, 79, 0.18)',
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Intensitet (1-100) og tint til expo-blur sin <BlurView>. */
export const Blur = {
  tabBar: { intensity: 40, tint: 'dark' as const },
  card: { intensity: 30, tint: 'dark' as const },
  sheet: { intensity: 50, tint: 'dark' as const },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Typography = {
  title: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  heading: { fontSize: 20, fontWeight: '600', lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 22 },
  bodyStrong: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '600', lineHeight: 16, letterSpacing: 0.4 },
} as const;
