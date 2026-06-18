import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';

import { GlassPanel } from '@/components/glass-panel';
import { screenStyles, useWideContentLayout } from '@/components/shared-styles';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { ApiError, fetchCategories, fetchSpecies, type Category, type Species } from '@/lib/api';

const CATEGORY_ORDER = [
  'Smådyr', 'Maur', 'Fluer og mygg', 'Veggedyr og andre teger', 'Kakerlakker',
  'Biller', 'Sommerfugler og møll', 'Lus', 'Edderkopper, midd og flått',
  'Veps, bier & humler', 'Gnagere', 'Fugler', 'Pattedyr', 'Krypdyr / Reptiler',
];

export default function OversiktScreen() {
  const wideContent = useWideContentLayout();
  const [categories, setCategories] = useState<Category[]>([]);
  const [species, setSpecies] = useState<Species[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, allSpecies] = await Promise.all([fetchCategories(), fetchSpecies()]);
      const sorted = [...cats].sort((a, b) => {
        const ai = CATEGORY_ORDER.indexOf(a.navn);
        const bi = CATEGORY_ORDER.indexOf(b.navn);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
      setCategories(sorted);
      setSpecies(allSpecies);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kunne ikke laste artsdata.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredSpecies = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return species.filter(
      (s) => s.navnNo.toLowerCase().includes(q) || s.navnLatin.toLowerCase().includes(q)
    );
  }, [species, query]);

  if (loading) {
    return (
      <View style={screenStyles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={screenStyles.centered}>
        <Text style={screenStyles.errorText}>{error}</Text>
        <Pressable style={screenStyles.retryButton} onPress={load}>
          <Text style={screenStyles.retryButtonText}>Prøv igjen</Text>
        </Pressable>
      </View>
    );
  }

  const showSearchResults = query.trim().length > 0;

  const ListHeader = (
    <View style={styles.header}>
      <View style={styles.searchBar}>
        <IconSymbol name="magnifyingglass" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Søk etter art…"
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
    </View>
  );

  return (
    <View style={screenStyles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {showSearchResults ? (
        <FlatList
          data={filteredSpecies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[screenStyles.listContent, wideContent && screenStyles.wideContent]}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <Text style={screenStyles.emptyText}>Ingen arter samsvarer med søket.</Text>
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
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.navn}
          contentContainerStyle={[screenStyles.listContent, wideContent && screenStyles.wideContent]}
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/oversikt/[kategori]', params: { kategori: item.navn } })
              }>
              <GlassPanel variant="card" style={screenStyles.row}>
                <View style={screenStyles.rowText}>
                  <Text style={screenStyles.rowTitle}>{item.navn}</Text>
                  <Text style={screenStyles.rowMeta}>{item.antall} arter</Text>
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

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    padding: 0,
  },
});
