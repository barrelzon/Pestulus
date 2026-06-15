import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { CategoryBadge } from '@/components/category-badge';
import { screenStyles } from '@/components/shared-styles';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { deleteHistoryRecord, getHistoryRecord, type ScanRecord } from '@/lib/history';

export default function HistorikkDetaljScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<ScanRecord | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      getHistoryRecord(id).then(setRecord);
    }, [id])
  );

  async function handleDelete() {
    await deleteHistoryRecord(id);
    router.back();
  }

  if (record === undefined) {
    return (
      <View style={screenStyles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (record === null) {
    return (
      <View style={screenStyles.centered}>
        <Text style={screenStyles.errorText}>Fant ikke dette søket. Det kan ha blitt slettet.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={screenStyles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: record.treff.navnNo }} />

      <Image source={{ uri: record.brukerBilde }} style={styles.image} />

      <View style={styles.header}>
        <Text style={styles.title}>{record.treff.navnNo}</Text>
        <Text style={styles.latin}>{record.treff.navnLatin}</Text>
        <View style={styles.metaRow}>
          <CategoryBadge label={record.treff.kategori} />
          <Text style={styles.confidenceText}>
            {Math.round(record.treff.konfidens * 100)}% sannsynlig
          </Text>
        </View>
        <Text style={styles.date}>{formatDate(record.tidspunkt)}</Text>
      </View>

      {record.treff.species && (
        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            router.push({ pathname: '/oversikt/art/[id]', params: { id: record.treff.species!.id } })
          }>
          <Text style={styles.primaryButtonText}>Se artsinformasjon</Text>
        </Pressable>
      )}

      {record.alternativeTreff.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Andre kandidater</Text>
          {record.alternativeTreff.map((treff, index) => (
            <View key={`${treff.navnNo}-${index}`} style={styles.candidateRow}>
              <View style={styles.candidateInfo}>
                <Text style={styles.candidateName}>{treff.navnNo}</Text>
                <Text style={styles.candidateLatin}>{treff.navnLatin}</Text>
              </View>
              <Text style={styles.confidenceText}>{Math.round(treff.konfidens * 100)}%</Text>
            </View>
          ))}
        </View>
      )}

      <Pressable style={styles.deleteButton} onPress={handleDelete}>
        <IconSymbol name="trash.fill" size={18} color={Colors.danger} />
        <Text style={styles.deleteButtonText}>Slett fra historikk</Text>
      </Pressable>
    </ScrollView>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('nb-NO', { dateStyle: 'long', timeStyle: 'short' });
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceAlt,
  },
  header: {
    gap: 4,
  },
  title: {
    ...Typography.title,
    color: Colors.text,
  },
  latin: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  confidenceText: {
    ...Typography.bodyStrong,
    color: Colors.accent,
  },
  date: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...Typography.bodyStrong,
    color: Colors.accentText,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  candidateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  candidateInfo: {
    flex: 1,
    gap: 2,
  },
  candidateName: {
    ...Typography.bodyStrong,
    color: Colors.text,
  },
  candidateLatin: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.dangerMuted,
  },
  deleteButtonText: {
    ...Typography.bodyStrong,
    color: Colors.danger,
  },
});
