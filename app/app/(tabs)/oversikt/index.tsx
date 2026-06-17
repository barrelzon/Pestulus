import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';

import { GlassPanel } from '@/components/glass-panel';
import { screenStyles } from '@/components/shared-styles';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { ApiError, fetchCategories, fetchSpecies, type Category, type Species } from '@/lib/api';

export default function OversiktScreen() {
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
      setCategories(cats);
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
      <Text style={styles.title}>Oversikt</Text>
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
          contentContainerStyle={screenStyles.listContent}
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
          contentContainerStyle={screenStyles.listContent}
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
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  title: {
    ...Typography.title,
    color: Colors.text,
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
