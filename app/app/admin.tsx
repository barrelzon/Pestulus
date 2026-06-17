import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassPanel } from '@/components/glass-panel';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import {
  ApiError,
  adminLogin,
  fetchAdminStats,
  resetAdminData,
  resolveImageUrl,
  type AdminFeedbackEntry,
  type AdminScanTreff,
  type AdminScanEntry,
  type AdminStats,
  type ScanImageSource,
  type VisionStatus,
} from '@/lib/api';

const statusLabels: Record<VisionStatus, string> = {
  treff: 'Treff',
  usikker: 'Usikker',
  ikke_skadedyr: 'Ikke skadedyr',
};

const sourceLabels: Record<ScanImageSource | 'mixed', string> = {
  camera: 'Kamera',
  library: 'Opplasting',
  unknown: 'Ukjent kilde',
  mixed: 'Blandet',
};

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const loadStats = useCallback(async (nextToken?: string) => {
    const activeToken = nextToken ?? token;
    if (!activeToken) return;
    setBusy(true);
    setError(null);
    try {
      setStats(await fetchAdminStats(activeToken));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kunne ikke hente admin-data.');
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadStats(token);
  }, [loadStats, token]);

  async function handleLogin() {
    if (busy) return;
    const nextPassword = password.trim();
    if (nextPassword.length === 0) {
      setError('Skriv inn passord.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await adminLogin(nextPassword);
      setToken(result.token);
      setPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kunne ikke logge inn.');
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    setToken(null);
    setStats(null);
    setPassword('');
    setError(null);
  }

  async function handleReset() {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      await resetAdminData(token);
      await loadStats(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kunne ikke nullstille admin-data.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
      ]}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <IconSymbol name="person.crop.circle.fill" size={26} color={Colors.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Skjult område</Text>
          <Text style={styles.title}>Admin</Text>
          <Text style={styles.subtitle}>Oversikt over søk og stemmer på riktig eller feil art.</Text>
        </View>
      </View>

      {!token ? (
        <GlassPanel variant="card" style={styles.loginPanel}>
          <View style={styles.loginTitleRow}>
            <IconSymbol name="lock.fill" size={20} color={Colors.accent} />
            <Text style={styles.sectionTitle}>Logg inn</Text>
          </View>
          <Text style={styles.inputLabel}>Passord</Text>
          <View
            style={[
              styles.passwordField,
              passwordFocused && styles.passwordFieldFocused,
              error && styles.passwordFieldError,
            ]}>
            <TextInput
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (error) setError(null);
              }}
              placeholder="Skriv passordet her"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              onSubmitEditing={handleLogin}
              selectionColor={Colors.accent}
              style={styles.input}
            />
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <Pressable
            style={[styles.primaryButton, busy && styles.disabledButton]}
            onPress={handleLogin}
            disabled={busy}>
            {busy ? (
              <ActivityIndicator color={Colors.accentText} />
            ) : (
              <Text style={styles.primaryButtonText}>Logg inn</Text>
            )}
          </Pressable>
        </GlassPanel>
      ) : (
        <AdminDashboard
          stats={stats}
          busy={busy}
          error={error}
          onRefresh={() => loadStats()}
          onReset={handleReset}
          onLogout={handleLogout}
        />
      )}
    </ScrollView>
  );
}

function AdminDashboard({
  stats,
  busy,
  error,
  onRefresh,
  onReset,
  onLogout,
}: {
  stats: AdminStats | null;
  busy: boolean;
  error: string | null;
  onRefresh: () => void;
  onReset: () => void;
  onLogout: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);

  if (!stats && busy) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} />
        <Text style={styles.mutedText}>Henter admin-data…</Text>
      </View>
    );
  }

  return (
    <View style={styles.dashboard}>
      <View style={styles.actionRow}>
        <Pressable style={styles.secondaryButton} onPress={onRefresh} disabled={busy}>
          <Text style={styles.secondaryButtonText}>{busy ? 'Oppdaterer…' : 'Oppdater'}</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, confirmReset && styles.dangerOutlineButton]}
          onPress={() => {
            if (!confirmReset) {
              setConfirmReset(true);
              return;
            }
            setConfirmReset(false);
            onReset();
          }}
          disabled={busy}>
          <Text style={[styles.secondaryButtonText, confirmReset && styles.dangerButtonText]}>
            {confirmReset ? 'Bekreft nullstilling' : 'Nullstill data'}
          </Text>
        </Pressable>
        {confirmReset && (
          <Pressable style={styles.secondaryButton} onPress={() => setConfirmReset(false)} disabled={busy}>
            <Text style={styles.secondaryButtonText}>Avbryt</Text>
          </Pressable>
        )}
        <Pressable style={styles.secondaryButton} onPress={onLogout}>
          <Text style={styles.secondaryButtonText}>Logg ut</Text>
        </Pressable>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {stats ? (
        <>
          <View style={styles.metricGrid}>
            <MetricCard label="Søk" value={stats.totals.scans} />
            <MetricCard label="Treff" value={stats.scanStatus.treff} />
            <MetricCard label="Usikker" value={stats.scanStatus.usikker} />
            <MetricCard label="Ikke skadedyr" value={stats.scanStatus.ikke_skadedyr} />
            <MetricCard label="Riktig art" value={stats.feedbackVotes.like} />
            <MetricCard label="Feil art" value={stats.feedbackVotes.dislike} />
          </View>

          <Section title="Ofte feil art">
            {stats.mostDisliked.length > 0 ? (
              stats.mostDisliked.map((item) => (
                <View key={`${item.kategori}:${item.navnNo}`} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{item.navnNo}</Text>
                    <Text style={styles.rowMeta}>{item.kategori}</Text>
                  </View>
                  <Text style={styles.badge}>{item.count}</Text>
                </View>
              ))
            ) : (
              <EmptyText text="Ingen feil-stemmer ennå." />
            )}
          </Section>

          <Section title="Siste søk">
            {stats.recentScans.length > 0 ? (
              stats.recentScans.map((entry) => (
                <ScanRow key={`${entry.scanId ?? entry.tidspunkt}:${entry.status}`} entry={entry} />
              ))
            ) : (
              <EmptyText text="Ingen søk logget ennå." />
            )}
          </Section>

          <Section title="Siste stemmer">
            {stats.recentFeedback.length > 0 ? (
              stats.recentFeedback.map((entry) => (
                <FeedbackRow key={`${entry.tidspunkt}:${entry.vote}:${entry.treff.navnNo}`} entry={entry} />
              ))
            ) : (
              <EmptyText text="Ingen stemmer logget ennå." />
            )}
          </Section>
        </>
      ) : (
        <EmptyText text="Ingen admin-data lastet." />
      )}
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <GlassPanel variant="card" style={styles.metricCard}>
      <IconSymbol name="chart.bar.fill" size={18} color={Colors.accent} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </GlassPanel>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <GlassPanel variant="card" style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </GlassPanel>
  );
}

function ScanRow({ entry }: { entry: AdminScanEntry }) {
  const candidates = entry.treff?.length ? entry.treff : entry.topTreff ? [entry.topTreff] : [];

  return (
    <View style={styles.scanCard}>
      <View style={styles.scanHeader}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{entry.topTreff?.navnNo ?? statusLabels[entry.status]}</Text>
          <Text style={styles.rowMeta}>
            {formatDate(entry.tidspunkt)} · {entry.imageCount} {entry.imageCount === 1 ? 'bilde' : 'bilder'}
            {entry.imageSource ? ` · ${sourceLabels[entry.imageSource]}` : ''}
          </Text>
          <Text style={styles.rowMeta}>
            {entry.scanId ? `Scan ${shortId(entry.scanId)}` : 'Eldre scan'}
            {entry.clientId ? ` · Klient ${shortId(entry.clientId)}` : ''}
          </Text>
        </View>
        <Text style={styles.statusText}>
          {entry.topTreff ? `${Math.round(entry.topTreff.konfidens * 100)}%` : statusLabels[entry.status]}
        </Text>
      </View>

      {entry.images && entry.images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.adminImageRow}>
          {entry.images.map((image, index) => (
            <View key={image.fileName} style={styles.adminImageWrap}>
              <Image
                source={{ uri: resolveImageUrl(image.imageUrl ?? image.urlPath) }}
                style={styles.adminImage}
                contentFit="cover"
              />
              <Text style={styles.adminImageLabel}>
                {sourceLabels[image.source] ?? `Bilde ${index + 1}`}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {candidates.length > 0 ? (
        <View style={styles.candidateList}>
          {candidates.map((candidate, index) => (
            <CandidateConfidenceRow key={`${candidate.navnNo}:${index}`} candidate={candidate} />
          ))}
        </View>
      ) : (
        <Text style={styles.mutedText}>Ingen artskandidater logget for dette søket.</Text>
      )}
    </View>
  );
}

function CandidateConfidenceRow({ candidate }: { candidate: AdminScanTreff }) {
  const confidence = Math.max(0, Math.min(1, candidate.konfidens));

  return (
    <View style={styles.candidateConfidenceRow}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{candidate.navnNo}</Text>
        <Text style={styles.rowMeta}>{candidate.kategori}</Text>
        <View style={styles.adminConfidenceTrack}>
          <View style={[styles.adminConfidenceFill, { flex: confidence }]} />
          <View style={{ flex: 1 - confidence }} />
        </View>
      </View>
      <Text style={styles.statusText}>{Math.round(candidate.konfidens * 100)}%</Text>
    </View>
  );
}

function FeedbackRow({ entry }: { entry: AdminFeedbackEntry }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{entry.vote === 'like' ? 'Riktig art' : 'Feil art'}</Text>
        <Text style={styles.rowMeta}>
          {entry.treff.navnNo}
          {entry.correctedSpeciesName ? ` → ${entry.correctedSpeciesName}` : ''} · {formatDate(entry.tidspunkt)}
          {entry.scanId ? ` · Scan ${shortId(entry.scanId)}` : ''}
        </Text>
      </View>
      <Text style={[styles.voteBadge, entry.vote === 'like' ? styles.likeBadge : styles.dislikeBadge]}>
        {entry.vote === 'like' ? 'OK' : 'Feil'}
      </Text>
    </View>
  );
}

function EmptyText({ text }: { text: string }) {
  return <Text style={styles.mutedText}>{text}</Text>;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function shortId(id: string) {
  return id.replace(/^client-/, '').slice(0, 8);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    ...Typography.label,
    color: Colors.accent,
    textTransform: 'uppercase',
  },
  title: {
    ...Typography.title,
    color: Colors.text,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  loginPanel: {
    padding: Spacing.lg,
    gap: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loginTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  passwordField: {
    width: '100%',
    minHeight: 64,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.accent,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
  },
  passwordFieldFocused: {
    borderColor: Colors.text,
  },
  passwordFieldError: {
    borderColor: Colors.danger,
  },
  input: {
    minHeight: 60,
    width: '100%',
    paddingHorizontal: Spacing.md,
    ...Typography.body,
    color: Colors.text,
  },
  inputLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...Typography.bodyStrong,
    color: Colors.accentText,
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    ...Typography.bodyStrong,
    color: Colors.text,
  },
  disabledButton: {
    opacity: 0.7,
  },
  errorText: {
    ...Typography.body,
    color: Colors.danger,
  },
  centered: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dashboard: {
    gap: Spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: 112,
    minHeight: 112,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  metricValue: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
    color: Colors.text,
  },
  metricLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  section: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.heading,
    color: Colors.text,
  },
  sectionBody: {
    gap: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  scanCard: {
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  scanHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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
  rowMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  badge: {
    ...Typography.bodyStrong,
    color: Colors.accentText,
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  statusText: {
    ...Typography.bodyStrong,
    color: Colors.accent,
  },
  adminImageRow: {
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  adminImageWrap: {
    width: 92,
    gap: 4,
  },
  adminImage: {
    width: 92,
    height: 74,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  adminImageLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  candidateList: {
    gap: Spacing.xs,
  },
  candidateConfidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  adminConfidenceTrack: {
    flexDirection: 'row',
    height: 5,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceAlt,
    marginTop: 4,
  },
  adminConfidenceFill: {
    borderRadius: Radius.pill,
    backgroundColor: Colors.accent,
  },
  dangerOutlineButton: {
    borderColor: Colors.danger,
  },
  dangerButtonText: {
    color: Colors.danger,
  },
  voteBadge: {
    ...Typography.label,
    borderRadius: Radius.pill,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  likeBadge: {
    color: Colors.accentText,
    backgroundColor: Colors.accent,
  },
  dislikeBadge: {
    color: Colors.text,
    backgroundColor: Colors.dangerMuted,
  },
  mutedText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
