import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryBadge } from '@/components/category-badge';
import { screenStyles } from '@/components/shared-styles';
import { SpeciesHero } from '@/components/species-hero';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { ApiError, fetchSpeciesById, resolveImageUrl, type Species } from '@/lib/api';

export default function ArtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [species, setSpecies] = useState<Species | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSpecies(await fetchSpeciesById(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kunne ikke laste arten.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={screenStyles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (error || !species) {
    return (
      <View style={screenStyles.centered}>
        <Text style={screenStyles.errorText}>{error ?? 'Fant ikke arten.'}</Text>
        <Pressable style={screenStyles.retryButton} onPress={load}>
          <Text style={screenStyles.retryButtonText}>Prøv igjen</Text>
        </Pressable>
      </View>
    );
  }

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/oversikt'));

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, title: species.navnNo }} />

      <ScrollView style={screenStyles.container} contentContainerStyle={styles.scrollContent}>
        <SpeciesHero imageUrl={resolveImageUrl(species.bildeUrl)} />

        <View style={styles.body}>
          <View style={styles.header}>
            <Text style={styles.navnNo}>{species.navnNo}</Text>
            <Text style={styles.latin}>{species.navnLatin}</Text>
            <CategoryBadge label={species.kategori} style={styles.badge} />
          </View>

          <Section title="Beskrivelse" text={species.beskrivelse} />
          <Section title="Helsemessig betydning" text={species.helsemessigBetydning} />
          <Section title="Tiltak" text={species.tiltak} />

          <View style={styles.sourceBox}>
            <Text style={styles.sourceText}>
              Kilde: FHIs skadedyrhåndbok. Innholdet er veiledende — ved helserisiko eller behov for
              bekjempelse, kontakt FHI eller en profesjonell skadedyrbekjemper.
            </Text>
            <Pressable onPress={() => Linking.openURL('https://www.fhi.no/sk/skadedyrhandboka/')}>
              <Text style={styles.sourceLink}>fhi.no/sk/skadedyrhandboka</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.floatingHeader, { top: insets.top + Spacing.sm }]} pointerEvents="box-none">
        <Pressable style={styles.glassPill} onPress={goBack} hitSlop={8}>
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.glassTint]} />
          <IconSymbol name="chevron.left" size={22} color={Colors.text} />
          <Text style={styles.floatingTitle} numberOfLines={1}>
            {species.navnNo}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.lg,
  },
  body: {
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  header: {
    gap: 4,
  },
  badge: {
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
  },
  navnNo: {
    ...Typography.title,
    color: Colors.text,
  },
  latin: {
    ...Typography.heading,
    color: Colors.text,
    fontStyle: 'italic',
  },
  section: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  sectionText: {
    ...Typography.body,
    color: Colors.text,
  },
  sourceBox: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.xs,
  },
  sourceText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  sourceLink: {
    ...Typography.caption,
    color: Colors.accent,
  },
  floatingHeader: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
  },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  glassTint: {
    backgroundColor: Colors.overlay,
  },
  floatingTitle: {
    ...Typography.bodyStrong,
    color: Colors.text,
    flexShrink: 1,
  },
});
