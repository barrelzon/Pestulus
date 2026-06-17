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

export default function HistorikkScreen() {
  const wideContent = useWideContentLayout();
  const [history, setHistory] = useState<ScanRecord[] | null>(null);
  const allSpecies = useAllSpecies();

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
        <Text style={screenStyles.emptyTitle}>Ingen søk ennå</Text>
        <Text style={screenStyles.emptyText}>
          Skann et skadedyr i Scan-fanen for å se resultatet her.
        </Text>
        <Pressable style={screenStyles.retryButton} onPress={() => router.push('/')}>
          <Text style={screenStyles.retryButtonText}>Gå til Scan</Text>
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
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/historikk/[id]', params: { id: item.id } })}>
            <GlassPanel variant="card" style={screenStyles.row}>
              <Image source={{ uri: item.brukerBilde }} style={styles.thumbnail} />
              <View style={screenStyles.rowText}>
                <SpeciesLink
                  navnNo={item.treff.navnNo}
                  allSpecies={allSpecies}
                  style={screenStyles.rowTitle}
                  noUnderline
                />
                <Text style={screenStyles.rowMeta}>{formatDate(item.tidspunkt)}</Text>
              </View>
              <CategoryBadge label={item.treff.kategori} />
              <Pressable onPress={() => handleDelete(item.id)} hitSlop={8} style={styles.deleteButton}>
                <IconSymbol name="trash.fill" size={18} color={Colors.textMuted} />
              </Pressable>
            </GlassPanel>
          </Pressable>
        )}
      />
    </View>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' });
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
