import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

type LogoVariant = 'horizontal' | 'mark' | 'stacked';
type LogoSize = 'sm' | 'md' | 'lg';

type PestulusLogoProps = {
  variant?: LogoVariant;
  size?: LogoSize;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

const metrics = {
  sm: { mark: 40, radius: Radius.md, p: 34, word: 38, gap: Spacing.sm },
  md: { mark: 52, radius: Radius.lg, p: 44, word: 48, gap: Spacing.md },
  lg: { mark: 72, radius: Radius.xl, p: 62, word: 66, gap: Spacing.md },
} as const;

export function PestulusLogo({
  variant = 'horizontal',
  size = 'md',
  color = Colors.accent,
  style,
}: PestulusLogoProps) {
  const logo = metrics[size];
  const markOnly = variant === 'mark';
  const stacked = variant === 'stacked';

  return (
    <View
      accessible
      accessibilityLabel="Pestulus"
      accessibilityRole="image"
      style={[styles.root, stacked && styles.stacked, { gap: logo.gap }, style]}>
      <View
        style={[
          styles.mark,
          {
            width: logo.mark,
            height: logo.mark,
            borderRadius: logo.radius,
            backgroundColor: color,
          },
        ]}>
        <Text
          allowFontScaling={false}
          style={[
            styles.markLetter,
            {
              color: Colors.accentText,
              fontSize: logo.p,
              lineHeight: logo.mark,
            },
          ]}>
          P
        </Text>
      </View>
      {!markOnly && (
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={[
            styles.wordmark,
            {
              color,
              fontSize: logo.word,
              lineHeight: logo.word + 6,
            },
          ]}>
          Pestulus
        </Text>
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
  },
  markLetter: {
    fontFamily: 'PestulusLogo',
    letterSpacing: 0,
    textAlign: 'center',
  },
  wordmark: {
    fontFamily: 'PestulusLogo',
    letterSpacing: 0,
  },
});
