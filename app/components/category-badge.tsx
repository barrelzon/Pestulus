import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

export function CategoryBadge({
  label,
  style,
}: {
  label: string;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.badge, style]}>{label}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    ...Typography.label,
    alignSelf: 'flex-start',
    color: Colors.accent,
    backgroundColor: Colors.accentMuted,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    overflow: 'hidden',
  },
});
