import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassPanel } from '@/components/glass-panel';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { ApiError, fetchSpecies, type Species } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

type SpeciesPickerModalProps = {
  visible: boolean;
  kategori: string;
  excludeIds: string[];
  onSelect: (species: Species) => void;
  onClose: () => void;
};

/** Lite vindu der brukeren kan velge riktig art innenfor en kategori (Dislike-flyt). */
export function SpeciesPickerModal({
  visible,
  kategori,
  excludeIds,
  onSelect,
  onClose,
}: SpeciesPickerModalProps) {
  const { language, t } = useI18n();
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const excludeKey = excludeIds.join(',');

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const exclude = new Set(excludeKey.split(',').filter(Boolean));
    fetchSpecies(language)
      .then((all) => {
        if (cancelled) return;
        setSpecies(
          all
            .filter((s) => ((s.kategoriId ?? s.kategori) === kategori || s.kategori === kategori) && !exclude.has(s.id))
            .sort((a, b) => a.navnNo.localeCompare(b.navnNo, language === 'no' ? 'nb' : language))
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : t('picker.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, kategori, excludeKey, language, t]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <GlassPanel variant="sheet" style={styles.panel}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('picker.title')}</Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <IconSymbol name="xmark" size={18} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.subtitle}>{t('picker.subtitle', { category: kategori })}</Text>

            {loading ? (
              <ActivityIndicator size="small" color={Colors.accent} style={styles.spinner} />
            ) : error ? (
              <Text style={styles.message}>{error}</Text>
            ) : species.length === 0 ? (
              <Text style={styles.message}>{t('picker.empty')}</Text>
            ) : (
              <FlatList
                data={species}
                keyExtractor={(item) => item.id}
                style={styles.list}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                renderItem={({ item }) => (
                  <Pressable style={styles.row} onPress={() => onSelect(item)}>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>{item.navnNo}</Text>
                      <Text style={styles.rowSubtitle}>{item.navnLatin}</Text>
                    </View>
                    <IconSymbol name="chevron.right" size={18} color={Colors.textMuted} />
                  </Pressable>
                )}
              />
            )}
          </GlassPanel>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
  },
  panel: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...Typography.heading,
    color: Colors.text,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  spinner: {
    marginVertical: Spacing.lg,
  },
  message: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  list: {
    maxHeight: 320,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
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
});
