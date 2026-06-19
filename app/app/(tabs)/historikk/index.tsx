import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';

import { CategoryBadge } from '@/components/category-badge';
import { GlassPanel } from '@/components/glass-panel';
import { screenStyles, useWideContentLayout } from '@/components/shared-styles';
import { SpeciesLink } from '@/components/species-link';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { deleteHistoryRecord, getHistory, type ScanRecord } from '@/lib/history';
import { useAllSpecies } from '@/hooks/use-all-species';
import { localeForLanguage, useI18n } from '@/lib/i18n';
import type { Species, Treff } from '@/lib/api';

export default function HistorikkScreen() {
  const { language, t } = useI18n();
  const wideContent = useWideContentLayout();
  const [history, setHistory] = useState<ScanRecord[] | null>(null);
  const allSpecies = useAllSpecies(language);

  useFocusEffect(
    useCallback(() => {
      getHistory().then(setHistory);
    }, [])
  );

  async function handleDelete(id: string) {
    await deleteHistoryRecord(id);
    setHistory((current) => current?.filter((record) => record.id !== id) ?? current);
  }

  if (history === null) {
    return (
      <View style={screenStyles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={screenStyles.centered}>
        <IconSymbol name="tray" size={40} color={Colors.textMuted} />
        <Text style={screenStyles.emptyTitle}>{t('history.emptyTitle')}</Text>
        <Text style={screenStyles.emptyText}>{t('history.emptyBody')}</Text>
        <Pressable style={screenStyles.retryButton} onPress={() => router.push('/')}>
          <Text style={screenStyles.retryButtonText}>{t('history.goToScan')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={screenStyles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[screenStyles.listContent, wideContent && screenStyles.wideContent]}
        renderItem={({ item }) => {
          const displaySpecies = findLocalizedSpecies(item.treff, allSpecies);
          const displayName = displaySpecies?.navnNo ?? item.treff.navnNo;
          const displayCategory = displaySpecies?.kategori ?? item.treff.kategori;
          const displayCategoryId = displaySpecies?.kategoriId ?? item.treff.kategoriId;

          return (
            <Pressable
              onPress={() => router.push({ pathname: '/historikk/[id]', params: { id: item.id } })}>
              <GlassPanel variant="card" style={screenStyles.row}>
                <Image source={{ uri: item.brukerBilde }} style={styles.thumbnail} />
                <View style={screenStyles.rowText}>
                  <SpeciesLink
                    navnNo={displayName}
                    allSpecies={allSpecies}
                    style={screenStyles.rowTitle}
                    noUnderline
                  />
                  <Text style={screenStyles.rowMeta}>{formatDate(item.tidspunkt, language)}</Text>
                </View>
                <CategoryBadge label={displayCategory} categoryId={displayCategoryId} />
                <Pressable onPress={() => handleDelete(item.id)} hitSlop={8} style={styles.deleteButton}>
                  <IconSymbol name="trash.fill" size={18} color={Colors.textMuted} />
                </Pressable>
              </GlassPanel>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function formatDate(iso: string, language: ReturnType<typeof useI18n>['language']) {
  return new Date(iso).toLocaleString(localeForLanguage(language), { dateStyle: 'short', timeStyle: 'short' });
}

function findLocalizedSpecies(treff: Treff, allSpecies: Species[]): Species | undefined {
  const id = treff.id ?? treff.species?.id;
  if (id) return allSpecies.find((species) => species.id === id);
  return allSpecies.find(
    (species) => species.navnNo === treff.navnNo || species.navnOriginalNo === treff.navnNo
  );
}

const styles = StyleSheet.create({
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
});
