import { StyleSheet, useWindowDimensions } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

const WIDE_LAYOUT_BREAKPOINT = 1180;

export function useWideContentLayout() {
  const { width } = useWindowDimensions();
  return width >= WIDE_LAYOUT_BREAKPOINT;
}

/** Delte stiler for liste-/detaljskjermer (Oversikt, History). */
export const screenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  wideContent: {
    width: '50%',
    minWidth: 720,
    maxWidth: 1040,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...Typography.bodyStrong,
    color: Colors.text,
  },
  rowSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  rowMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  errorText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyTitle: {
    ...Typography.heading,
    color: Colors.text,
    textAlign: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  retryButtonText: {
    ...Typography.bodyStrong,
    color: Colors.accentText,
  },
});
