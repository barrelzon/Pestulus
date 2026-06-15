import { Image } from 'expo-image';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryBadge } from '@/components/category-badge';
import { GlassPanel } from '@/components/glass-panel';
import { SpeciesPickerModal } from '@/components/species-picker-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { ApiError, scanImage, sendFeedback, type Species, type Treff } from '@/lib/api';
import { addHistoryRecord } from '@/lib/history';

type ScanUiResult =
  | { kind: 'treff'; photoUri: string; treff: Treff; alternative: Treff[] }
  | { kind: 'usikker'; photoUri: string; treff: Treff[] }
  | { kind: 'ikke_skadedyr'; photoUri: string }
  | { kind: 'error'; message: string };

const SHEET_OFFSET = 420;

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanUiResult | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const translateY = useSharedValue(SHEET_OFFSET);

  useEffect(() => {
    translateY.value = withTiming(sheetVisible ? 0 : SHEET_OFFSET, { duration: 280 });
  }, [sheetVisible, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!permission) {
    return <View style={styles.container} />;
  }

  const cameraReady = permission.granted;
  const webBlocked = Platform.OS === 'web' && permission.status === 'denied';

  async function processImage(uri: string) {
    try {
      const rendered = await ImageManipulator.manipulate(uri).resize({ width: 1024 }).renderAsync();
      const saved = await rendered.saveAsync({ compress: 0.6, format: SaveFormat.JPEG, base64: true });
      if (!saved.base64) throw new Error('Kunne ikke behandle bildet.');

      const photoUri = `data:image/jpeg;base64,${saved.base64}`;
      const apiResult = await scanImage(saved.base64);

      if (apiResult.status === 'treff' && apiResult.treff[0]) {
        const [top, ...alternative] = apiResult.treff;
        await addHistoryRecord({ brukerBilde: photoUri, treff: top, alternativeTreff: alternative });
        setResult({ kind: 'treff', photoUri, treff: top, alternative });
      } else if (apiResult.status === 'usikker') {
        setResult({ kind: 'usikker', photoUri, treff: apiResult.treff });
      } else {
        setResult({ kind: 'ikke_skadedyr', photoUri });
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Noe gikk feil. Prøv igjen.';
      setResult({ kind: 'error', message });
    } finally {
      setBusy(false);
      setSheetVisible(true);
    }
  }

  async function handleCapture() {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 }).catch(() => null);
    if (!photo?.uri) {
      setResult({ kind: 'error', message: 'Noe gikk feil. Prøv igjen.' });
      setBusy(false);
      setSheetVisible(true);
      return;
    }
    await processImage(photo.uri);
  }

  async function handlePickImage() {
    if (busy) return;
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (picked.canceled || !picked.assets[0]) return;
      setBusy(true);
      await processImage(picked.assets[0].uri);
    } catch {
      setResult({ kind: 'error', message: 'Kunne ikke åpne bildevelgeren. Prøv igjen.' });
      setBusy(false);
      setSheetVisible(true);
    }
  }

  function closeSheet() {
    setSheetVisible(false);
  }

  return (
    <View style={styles.container}>
      {cameraReady ? (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} flash={flash} />
      ) : (
        <View style={[styles.container, styles.centered]}>
          <GlassPanel variant="card" style={styles.permissionCard}>
            <IconSymbol name="camera.fill" size={36} color={Colors.accent} />
            <Text style={styles.permissionTitle}>Kameratilgang</Text>
            <Text style={styles.permissionBody}>
              Pestulus bruker kameraet til å ta bilde av skadedyret du vil identifisere. Bildet
              sendes til en KI-tjeneste for gjenkjenning.
            </Text>
            {webBlocked ? (
              <>
                <Text style={styles.permissionBody}>
                  Nettleseren har blokkert kameratilgang for denne siden. Klikk på kamera- eller
                  hengelås-ikonet i adressefeltet, slå på kamera, og last siden på nytt.
                </Text>
                <Pressable style={styles.primaryButton} onPress={() => window.location.reload()}>
                  <Text style={styles.primaryButtonText}>Last siden på nytt</Text>
                </Pressable>
              </>
            ) : (
              <Pressable style={styles.primaryButton} onPress={requestPermission}>
                <Text style={styles.primaryButtonText}>Gi tilgang til kamera</Text>
              </Pressable>
            )}
            {!permission.canAskAgain && Platform.OS !== 'web' && (
              <Pressable style={styles.secondaryButton} onPress={() => Linking.openSettings()}>
                <Text style={styles.secondaryButtonText}>Åpne innstillinger</Text>
              </Pressable>
            )}
            <Pressable style={styles.secondaryButton} onPress={handlePickImage} disabled={busy}>
              <Text style={styles.secondaryButtonText}>Velg bilde fra fil i stedet</Text>
            </Pressable>
          </GlassPanel>
        </View>
      )}

      {cameraReady && !sheetVisible && (
        <View style={[styles.topBar, { top: insets.top + Spacing.sm }]}>
          <Pressable onPress={() => setFlash((current) => (current === 'off' ? 'on' : 'off'))}>
            <GlassPanel variant="card" style={styles.controlButton}>
              <IconSymbol
                name={flash === 'on' ? 'bolt.fill' : 'bolt.slash.fill'}
                size={20}
                color={Colors.text}
              />
            </GlassPanel>
          </Pressable>
          <Pressable onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))}>
            <GlassPanel variant="card" style={styles.controlButton}>
              <IconSymbol name="arrow.triangle.2.circlepath.camera.fill" size={20} color={Colors.text} />
            </GlassPanel>
          </Pressable>
        </View>
      )}

      {cameraReady && !sheetVisible && (
        <View style={[styles.bottomArea, { bottom: insets.bottom + Spacing.xl }]}>
          <Text style={styles.privacyText}>
            Bildet sendes til en KI-tjeneste for artsgjenkjenning og lagres ikke av Pestulus.
          </Text>
          <View style={styles.captureRow}>
            <Pressable onPress={handlePickImage} disabled={busy}>
              <GlassPanel variant="card" style={styles.galleryButton}>
                <IconSymbol name="photo.fill" size={22} color={Colors.text} />
              </GlassPanel>
            </Pressable>
            <Pressable style={styles.shutterOuter} onPress={handleCapture} disabled={busy}>
              <View style={styles.shutterInner} />
            </Pressable>
            <View style={styles.galleryButton} />
          </View>
        </View>
      )}

      {busy && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Analyserer bilde…</Text>
        </View>
      )}

      <Animated.View
        style={[styles.sheetWrapper, sheetStyle]}
        pointerEvents={sheetVisible ? 'auto' : 'none'}>
        <GlassPanel variant="sheet" style={styles.sheetPanel}>
          {result && <ScanResultContent result={result} onClose={closeSheet} />}
        </GlassPanel>
      </Animated.View>
    </View>
  );
}

function ScanResultContent({ result, onClose }: { result: ScanUiResult; onClose: () => void }) {
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [corrected, setCorrected] = useState<Species | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(false);

  useEffect(() => {
    setFeedback(null);
    setPickerVisible(false);
    setCorrected(null);
    setShowAlternatives(false);
  }, [result]);

  function handleLike() {
    if (result.kind !== 'treff' || feedback) return;
    setFeedback('like');
    sendFeedback({
      vote: 'like',
      treff: { navnNo: result.treff.navnNo, navnLatin: result.treff.navnLatin, kategori: result.treff.kategori },
    }).catch(() => {
      // Stille feil - tilbakemelding er ikke kritisk for brukeropplevelsen.
    });
  }

  function handleDislike() {
    if (result.kind !== 'treff' || feedback) return;
    setFeedback('dislike');
    setPickerVisible(true);
    sendFeedback({
      vote: 'dislike',
      treff: { navnNo: result.treff.navnNo, navnLatin: result.treff.navnLatin, kategori: result.treff.kategori },
    }).catch(() => {
      // Stille feil - tilbakemelding er ikke kritisk for brukeropplevelsen.
    });
  }

  function handleSelectSpecies(species: Species) {
    setPickerVisible(false);
    setCorrected(species);
    if (result.kind !== 'treff') return;
    sendFeedback({
      vote: 'dislike',
      treff: { navnNo: result.treff.navnNo, navnLatin: result.treff.navnLatin, kategori: result.treff.kategori },
      korrigertArtId: species.id,
    }).catch(() => {
      // Stille feil - tilbakemelding er ikke kritisk for brukeropplevelsen.
    });
  }

  const excludeIds =
    result.kind === 'treff'
      ? [result.treff.species?.id, ...result.alternative.map((t) => t.species?.id)].filter(
          (id): id is string => typeof id === 'string'
        )
      : [];

  // Appen viser kun topp 3 i scan-resultatet - resten av de opptil 5 kandidatene
  // fra backend beholdes i `result` (og historikk) for senere bruk.
  const displayedAlternatives = result.kind === 'treff' ? result.alternative.slice(0, 2) : [];
  const displayedUncertain = result.kind === 'usikker' ? result.treff.slice(0, 3) : [];

  return (
    <View style={styles.sheetContent}>
      <View style={styles.sheetHeader}>
        {result.kind === 'error' ? (
          <View style={[styles.thumbnail, styles.errorIcon]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={26} color={Colors.danger} />
          </View>
        ) : (
          <Image source={{ uri: result.photoUri }} style={styles.thumbnail} />
        )}

        <View style={styles.sheetHeaderText}>
          {result.kind === 'treff' && (
            <>
              <Text style={styles.resultTitle}>{result.treff.navnNo}</Text>
              <Text style={styles.resultLatin}>{result.treff.navnLatin}</Text>
            </>
          )}
          {result.kind === 'usikker' && (
            <>
              <Text style={styles.resultTitle}>Usikkert resultat</Text>
              <Text style={styles.resultBody}>
                Vi er usikre på hvilken art dette er. Her er de mest sannsynlige
                kandidatene - bekreft identifiseringen før du eventuelt gjør noe
                med skadedyret.
              </Text>
            </>
          )}
          {result.kind === 'ikke_skadedyr' && (
            <>
              <Text style={styles.resultTitle}>Ingen skadedyr funnet</Text>
              <Text style={styles.resultBody}>
                Vi fant ikke noe skadedyr i bildet. Prøv å ta bildet nærmere eller med bedre lys.
              </Text>
            </>
          )}
          {result.kind === 'error' && (
            <>
              <Text style={styles.resultTitle}>Noe gikk feil</Text>
              <Text style={styles.resultBody}>{result.message}</Text>
            </>
          )}
        </View>

        <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
          <IconSymbol name="xmark" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {result.kind === 'treff' && (
        <>
          <View style={styles.metaRow}>
            <CategoryBadge label={result.treff.kategori} />
            <Text style={styles.confidenceText}>
              {Math.round(result.treff.konfidens * 100)}% sannsynlig
            </Text>
          </View>

          {feedback === null ? (
            <View style={styles.feedbackRow}>
              <Pressable style={styles.feedbackButton} onPress={handleLike}>
                <IconSymbol name="hand.thumbsup.fill" size={16} color={Colors.textSecondary} />
                <Text style={styles.feedbackButtonText}>Riktig art</Text>
              </Pressable>
              <Pressable style={styles.feedbackButton} onPress={handleDislike}>
                <IconSymbol name="hand.thumbsdown.fill" size={16} color={Colors.textSecondary} />
                <Text style={styles.feedbackButtonText}>Feil art</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.feedbackThanks}>
              {feedback === 'like'
                ? 'Takk for tilbakemeldingen!'
                : corrected
                  ? `Takk! Vi registrerer at det egentlig var ${corrected.navnNo}.`
                  : 'Takk for tilbakemeldingen.'}
            </Text>
          )}

          {result.treff.species && (
            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                router.push({
                  pathname: '/oversikt/art/[id]',
                  params: { id: result.treff.species!.id },
                })
              }>
              <Text style={styles.primaryButtonText}>Se detaljer</Text>
            </Pressable>
          )}

          {displayedAlternatives.length > 0 && (
            <View style={styles.alternativesSection}>
              <Pressable
                style={styles.alternativesToggle}
                onPress={() => setShowAlternatives((current) => !current)}>
                <Text style={styles.alternativesToggleText}>
                  {showAlternatives
                    ? 'Skjul andre muligheter'
                    : `Andre muligheter (${displayedAlternatives.length})`}
                </Text>
                <IconSymbol
                  name={showAlternatives ? 'chevron.up' : 'chevron.down'}
                  size={18}
                  color={Colors.textSecondary}
                />
              </Pressable>
              {showAlternatives &&
                displayedAlternatives.map((t, index) => (
                  <CandidateRow key={`${t.navnNo}-${index}`} treff={t} />
                ))}
            </View>
          )}

          <SpeciesPickerModal
            visible={pickerVisible}
            kategori={result.treff.kategori}
            excludeIds={excludeIds}
            onSelect={handleSelectSpecies}
            onClose={() => setPickerVisible(false)}
          />
        </>
      )}

      {result.kind === 'usikker' && (
        <>
          <View style={styles.warningBanner}>
            <IconSymbol name="exclamationmark.triangle.fill" size={16} color={Colors.accent} />
            <Text style={styles.warningBannerText}>Bør verifiseres</Text>
          </View>
          {displayedUncertain.map((t, index) => (
            <CandidateRow key={`${t.navnNo}-${index}`} treff={t} />
          ))}
        </>
      )}

      {result.kind === 'error' && (
        <Pressable style={styles.primaryButton} onPress={onClose}>
          <Text style={styles.primaryButtonText}>Lukk</Text>
        </Pressable>
      )}
    </View>
  );
}

function CandidateRow({ treff }: { treff: Treff }) {
  const speciesId = treff.species?.id;

  return (
    <Pressable
      style={styles.candidateRow}
      disabled={!speciesId}
      onPress={() =>
        speciesId && router.push({ pathname: '/oversikt/art/[id]', params: { id: speciesId } })
      }>
      <View style={styles.candidateInfo}>
        <Text style={styles.candidateName}>{treff.navnNo}</Text>
        <Text style={styles.candidateLatin}>{treff.navnLatin}</Text>
      </View>
      <View style={styles.candidateRight}>
        <Text style={styles.confidenceText}>{Math.round(treff.konfidens * 100)}%</Text>
        {speciesId && <IconSymbol name="chevron.right" size={16} color={Colors.textMuted} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  permissionCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  permissionTitle: {
    ...Typography.heading,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  permissionBody: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  primaryButtonText: {
    ...Typography.bodyStrong,
    color: Colors.accentText,
  },
  secondaryButton: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...Typography.body,
    color: Colors.accent,
  },
  topBar: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bottomArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: Spacing.md,
  },
  privacyText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Spacing.xl,
  },
  galleryButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.text,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text,
  },
  sheetWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  sheetPanel: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sheetContent: {
    gap: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
  },
  errorIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dangerMuted,
  },
  sheetHeaderText: {
    flex: 1,
    gap: 4,
  },
  resultTitle: {
    ...Typography.heading,
    color: Colors.text,
  },
  resultLatin: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  resultBody: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confidenceText: {
    ...Typography.bodyStrong,
    color: Colors.accent,
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  feedbackButtonText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  feedbackThanks: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: Colors.accentMuted,
    borderRadius: Radius.pill,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
  },
  warningBannerText: {
    ...Typography.label,
    color: Colors.accent,
  },
  alternativesSection: {
    gap: Spacing.xs,
  },
  alternativesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  alternativesToggleText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  candidateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  candidateInfo: {
    flex: 1,
    gap: 2,
  },
  candidateRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
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
});
