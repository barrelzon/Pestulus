import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { GlassPanel } from '@/components/glass-panel';
import { screenStyles } from '@/components/shared-styles';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { ApiError, fetchSpecies, type Species } from '@/lib/api';

export default function KategoriScreen() {
  const { kategori } = useLocalSearchParams<{ kategori: string }>();
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchSpecies();
      setSpecies(all.filter((s) => s.kategori === kategori));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kunne ikke laste arter.');
    } finally {
      setLoading(false);
    }
  }, [kategori]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={screenStyles.container}>
      <Stack.Screen options={{ title: kategori }} />

      {loading ? (
        <View style={screenStyles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : error ? (
        <View style={screenStyles.centered}>
          <Text style={screenStyles.errorText}>{error}</Text>
          <Pressable style={screenStyles.retryButton} onPress={load}>
            <Text style={screenStyles.retryButtonText}>Prøv igjen</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={species}
          keyExtractor={(item) => item.id}
          contentContainerStyle={screenStyles.listContent}
          ListEmptyComponent={
            <Text style={screenStyles.emptyText}>Ingen arter i denne kategorien ennå.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/oversikt/art/[id]', params: { id: item.id } })}>
              <GlassPanel variant="card" style={screenStyles.row}>
                <View style={screenStyles.rowText}>
                  <Text style={screenStyles.rowTitle}>{item.navnNo}</Text>
                  <Text style={screenStyles.rowSubtitle}>{item.navnLatin}</Text>
                </View>
                <IconSymbol name="chevron.right" size={18} color={Colors.textMuted} />
              </GlassPanel>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
