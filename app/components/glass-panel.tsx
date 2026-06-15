import { BlurView } from 'expo-blur';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Blur, Colors } from '@/constants/theme';

type GlassPanelProps = PropsWithChildren<{
  variant?: keyof typeof Blur;
  style?: StyleProp<ViewStyle>;
}>;

/** Gjennomskinnelig "liquid glass"-flate: BlurView + dempet tint-lag. */
export function GlassPanel({ variant = 'card', style, children }: GlassPanelProps) {
  const { intensity, tint } = Blur[variant];

  return (
    <View style={[styles.container, style]}>
      <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.tint]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  tint: {
    backgroundColor: Colors.surface,
    opacity: 0.6,
  },
});
