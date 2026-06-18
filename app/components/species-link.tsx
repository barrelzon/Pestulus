import { router } from 'expo-router';
import { StyleSheet, Text, type TextStyle } from 'react-native';
import { Colors } from '@/constants/theme';
import type { Species } from '@/lib/api';

type LinkProps = {
  navnNo: string;
  allSpecies: Species[];
  style?: TextStyle;
  noUnderline?: boolean;
};

export function SpeciesLink({ navnNo, allSpecies, style, noUnderline }: LinkProps) {
  const match = allSpecies.find((s) => s.navnNo === navnNo);
  if (!match) {
    return <Text selectable style={style}>{navnNo}</Text>;
  }
  return (
    <Text
      selectable
      style={[style, styles.link, noUnderline && styles.noUnderline]}
      onPress={() => router.push({ pathname: '/oversikt/art/[id]', params: { id: match.id } })}>
      {navnNo}
    </Text>
  );
}

type TextProps = {
  tekst: string;
  allSpecies: Species[];
  textStyle?: TextStyle;
};

export function ForvekslingText({ tekst, allSpecies, textStyle }: TextProps) {
  const segments = parseForveksling(tekst, allSpecies);
  return (
    <Text selectable style={textStyle}>
      {segments.map((seg, i) =>
        seg.speciesId ? (
          <Text
            selectable
            key={i}
            style={styles.link}
            onPress={() =>
              router.push({ pathname: '/oversikt/art/[id]', params: { id: seg.speciesId! } })
            }>
            {seg.text}
          </Text>
        ) : (
          <Text selectable key={i}>{seg.text}</Text>
        )
      )}
    </Text>
  );
}

type Segment = { text: string; speciesId: string | null };

function parseForveksling(tekst: string, allSpecies: Species[]): Segment[] {
  type Match = { start: number; end: number; id: string };
  const matches: Match[] = [];

  for (const sp of allSpecies) {
    let pos = 0;
    let idx: number;
    while ((idx = tekst.indexOf(sp.navnNo, pos)) !== -1) {
      matches.push({ start: idx, end: idx + sp.navnNo.length, id: sp.id });
      pos = idx + 1;
    }
  }

  matches.sort((a, b) => a.start - b.start || b.end - a.end);

  const filtered: Match[] = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      filtered.push(m);
      lastEnd = m.end;
    }
  }

  const result: Segment[] = [];
  let pos = 0;
  for (const m of filtered) {
    if (pos < m.start) result.push({ text: tekst.slice(pos, m.start), speciesId: null });
    result.push({ text: tekst.slice(m.start, m.end), speciesId: m.id });
    pos = m.end;
  }
  if (pos < tekst.length) result.push({ text: tekst.slice(pos), speciesId: null });

  return result.length > 0 ? result : [{ text: tekst, speciesId: null }];
}

const styles = StyleSheet.create({
  link: {
    color: Colors.accent,
    textDecorationLine: 'underline',
  },
  noUnderline: {
    textDecorationLine: 'none',
  },
});
