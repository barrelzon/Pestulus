/**
 * Gjenbrukbare kort-komponenter for kjennetegn og forveksling.
 * Brukes i scan-resultatet og i artsdetaljsiden.
 */
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import type { Species } from '@/lib/api';

// ── Kjennetegn ──────────────────────────────────────────────────────────────

export function KjennetegnKort({ tekst }: { tekst: string }) {
  const punkter = parseKjennetegn(tekst);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Kjennetegn</Text>
      <View style={styles.bulletList}>
        {punkter.map((p, i) => (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text selectable style={styles.bulletText}>{p}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function parseKjennetegn(text: string): string[] {
  return text
    .split(/;\s*/)
    .flatMap((s) => s.split(/\.\s+(?=[A-ZÆØÅ0-9\d])/))
    .map((s) => s.trim().replace(/\.$/, '').trim())
    .filter((s) => s.length > 0);
}

// ── Forveksling ─────────────────────────────────────────────────────────────

type ForvekslingsItem = { navnNo: string; id: string | null; beskrivelse: string };

export function ForvekslingsKort({
  tekst,
  allSpecies,
}: {
  tekst: string;
  allSpecies: Species[];
}) {
  const items = parseForveksling(tekst, allSpecies);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Kan forveksles med</Text>
      {items.map((item, i) => (
        <View key={i}>
          {i > 0 && <View style={styles.separator} />}
          {item.id ? (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/oversikt/art/[id]', params: { id: item.id! } })
              }>
              <Text selectable style={styles.forvekslingsNavn}>{item.navnNo}</Text>
            </Pressable>
          ) : (
            <Text selectable style={styles.forvekslingsNavnPlain}>{item.navnNo}</Text>
          )}
          {item.beskrivelse.length > 0 && (
            <Text selectable style={styles.forvekslingsBeskrivelse}>{item.beskrivelse}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

function parseForveksling(tekst: string, allSpecies: Species[]): ForvekslingsItem[] {
  type Hit = { start: number; end: number; navnNo: string; id: string };
  const hits: Hit[] = [];

  for (const sp of allSpecies) {
    let pos = 0;
    let idx: number;
    while ((idx = tekst.indexOf(sp.navnNo, pos)) !== -1) {
      hits.push({ start: idx, end: idx + sp.navnNo.length, navnNo: sp.navnNo, id: sp.id });
      pos = idx + 1;
    }
  }

  hits.sort((a, b) => a.start - b.start || b.end - a.end);

  const filtered: Hit[] = [];
  let last = -1;
  for (const h of hits) {
    if (h.start >= last) { filtered.push(h); last = h.end; }
  }

  if (filtered.length === 0) {
    return [{ navnNo: tekst, id: null, beskrivelse: '' }];
  }

  return filtered.map((h, i) => {
    const nextStart = filtered[i + 1]?.start ?? tekst.length;
    const raw = tekst.slice(h.end, nextStart).trim();
    // Strip leading punctuation/space before description
    const beskrivelse = raw.replace(/^[\s.,;:–—-]+/, '').replace(/[.\s]+$/, '').trim();
    return { navnNo: h.navnNo, id: h.id, beskrivelse };
  });
}

// ── MetricPill ───────────────────────────────────────────────────────────────

export function MetricPill({ label }: { label: string }) {
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricPillText}>{label}</Text>
    </View>
  );
}

export type Metrics = { size: string | null; color: string | null };

export function extractMetrics(kjennetegn: string): Metrics {
  const sizeMatch = kjennetegn.match(/\d+[,–\-]\d+\s*(?:mm|cm)|\d+\s*(?:mm|cm)/i);
  const size = sizeMatch ? sizeMatch[0].replace(/\s+/g, ' ') : null;

  const colorWords =
    /(?:mørk\s+|lys\s+|lys[ea]\s*)?(?:brun|svart|grå|grønn|gul|rød|hvit|blå|metallisk|oransje|gjennomsiktig|lysebrun|mørkebrun)/i;
  const colorMatch = kjennetegn.match(colorWords);
  const color = colorMatch ? colorMatch[0].toLowerCase() : null;

  return { size, color };
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardTitle: {
    ...Typography.label,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  bulletList: {
    gap: Spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  bullet: {
    ...Typography.body,
    color: Colors.accent,
    lineHeight: 22,
    width: 12,
  },
  bulletText: {
    ...Typography.body,
    color: Colors.text,
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  forvekslingsNavn: {
    ...Typography.bodyStrong,
    color: Colors.accent,
    textDecorationLine: 'underline',
  },
  forvekslingsNavnPlain: {
    ...Typography.bodyStrong,
    color: Colors.text,
  },
  forvekslingsBeskrivelse: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  metricPill: {
    borderRadius: Radius.pill,
    backgroundColor: Colors.accent,
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
  },
  metricPillText: {
    ...Typography.label,
    color: Colors.accentText,
  },
});
