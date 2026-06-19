import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

const categoryColors: Record<string, { backgroundColor: string; color: string }> = {
  'Smådyr': { backgroundColor: 'rgba(201, 162, 75, 0.20)', color: '#D8B863' },
  'Maur': { backgroundColor: 'rgba(176, 102, 58, 0.22)', color: '#D98A55' },
  'Fluer og mygg': { backgroundColor: 'rgba(94, 151, 190, 0.22)', color: '#7FB5DB' },
  'Veggedyr og andre teger': { backgroundColor: 'rgba(171, 86, 96, 0.22)', color: '#D57783' },
  'Kakerlakker': { backgroundColor: 'rgba(150, 105, 64, 0.24)', color: '#C98C5A' },
  'Biller': { backgroundColor: 'rgba(116, 141, 80, 0.24)', color: '#A5C06C' },
  'Sommerfugler og møll': { backgroundColor: 'rgba(177, 116, 166, 0.22)', color: '#D894C9' },
  'Lus': { backgroundColor: 'rgba(151, 125, 91, 0.24)', color: '#C9A875' },
  'Edderkopper, midd og flått': { backgroundColor: 'rgba(106, 126, 145, 0.24)', color: '#97ACBF' },
  'Veps, bier & humler': { backgroundColor: 'rgba(216, 172, 65, 0.22)', color: '#E6C05C' },
  'Gnagere': { backgroundColor: 'rgba(129, 142, 152, 0.24)', color: '#B0BDC6' },
  'Fugler': { backgroundColor: 'rgba(92, 145, 132, 0.24)', color: '#83BFAF' },
  'Pattedyr': { backgroundColor: 'rgba(132, 112, 171, 0.24)', color: '#B29AD9' },
  'Krypdyr / Reptiler': { backgroundColor: 'rgba(88, 150, 101, 0.24)', color: '#7FC98E' },
};

export function CategoryBadge({
  label,
  categoryId,
  style,
}: {
  label: string;
  categoryId?: string;
  style?: StyleProp<TextStyle>;
}) {
  const colors = categoryColors[categoryId ?? label] ?? {
    backgroundColor: Colors.accentMuted,
    color: Colors.accent,
  };

  return <Text style={[styles.badge, colors, style]}>{label}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    ...Typography.label,
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    overflow: 'hidden',
  },
});
