import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

type LogoVariant = 'horizontal' | 'mark' | 'stacked' | 'wordmark';
type LogoSize = 'sm' | 'md' | 'lg';

type PestulusLogoProps = {
  variant?: LogoVariant;
  size?: LogoSize;
  style?: StyleProp<ViewStyle>;
};

const metrics = {
  sm: { mark: 40, radius: Radius.md, wordWidth: 132, wordHeight: 46, gap: Spacing.sm },
  md: { mark: 52, radius: Radius.lg, wordWidth: 236, wordHeight: 82, gap: Spacing.md },
  lg: { mark: 72, radius: Radius.xl, wordWidth: 276, wordHeight: 96, gap: Spacing.md },
} as const;

const wordmarkSource = require('../assets/images/pestulus-wordmark-muted-brass.png');
const markSource = require('../assets/images/icon.png');

export function PestulusLogo({
  variant = 'horizontal',
  size = 'md',
  style,
}: PestulusLogoProps) {
  const logo = metrics[size];
  const markOnly = variant === 'mark';
  const stacked = variant === 'stacked';
  const wordmarkOnly = variant === 'wordmark';

  return (
    <View
      accessible
      accessibilityLabel="Pestulus"
      accessibilityRole="image"
      style={[styles.root, stacked && styles.stacked, { gap: logo.gap }, style]}>
      {!wordmarkOnly && (
        <View
          style={[
            styles.mark,
            {
              width: logo.mark,
              height: logo.mark,
              borderRadius: logo.radius,
            },
          ]}>
          <Image source={markSource} contentFit="cover" style={StyleSheet.absoluteFill} />
        </View>
      )}
      {!markOnly && (
        <Image
          source={wordmarkSource}
          contentFit="contain"
          style={[styles.wordmark, { width: logo.wordWidth, height: logo.wordHeight }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stacked: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  wordmark: {
    flexShrink: 0,
  },
});
