import { Image } from 'expo-image';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryBadge } from '@/components/category-badge';
import { GlassPanel } from '@/components/glass-panel';
import { PestulusLogo } from '@/components/pestulus-logo';
import { KjennetegnKort, ForvekslingsKort } from '@/components/species-cards';
import { SpeciesLink } from '@/components/species-link';
import { SpeciesPickerModal } from '@/components/species-picker-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { ApiError, scanImages, sendFeedback, type ScanImageSource, type Species, type Treff } from '@/lib/api';
import { useAllSpecies } from '@/hooks/use-all-species';
import { getClientId } from '@/lib/client-id';
import { confidenceColor, confidenceLabel } from '@/lib/confidence';
import { addHistoryRecord } from '@/lib/history';

type ScanUiResult =
  | { kind: 'treff'; scanId?: string; photoUri: string; treff: Treff; alternative: Treff[] }
  | { kind: 'usikker'; scanId?: string; photoUri: string; treff: Treff[] }
  | { kind: 'ikke_skadedyr'; scanId?: string; photoUri: string }
  | { kind: 'error'; message: string };

const SHEET_OFFSET = 560;
const MAX_SCAN_IMAGES = 3;

type SelectedScanImage = {
  id: string;
  uri: string;
  source: ScanImageSource;
};

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [busy, setBusy] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedScanImage[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [zoom, setZoom] = useState(0);
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
  const hasSelectedImages = selectedImages.length > 0;
  const canAddImages = selectedImages.length < MAX_SCAN_IMAGES;
  const showCamera = cameraReady && cameraActive && !sheetVisible;
  const showEntry = !cameraActive && !sheetVisible && !hasSelectedImages;
  const showReview = hasSelectedImages && !sheetVisible && !cameraActive;

  function makeScanImage(uri: string, source: ScanImageSource): SelectedScanImage {
    return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, uri, source };
  }

  function addSelectedUris(uris: string[], source: ScanImageSource) {
    setSelectedImages((current) => {
      const remaining = MAX_SCAN_IMAGES - current.length;
      const additions = uris.slice(0, remaining).map((uri) => makeScanImage(uri, source));
      return [...current, ...additions];
    });
  }

  function removeSelectedImage(id: string) {
    setSelectedImages((current) => current.filter((image) => image.id !== id));
  }

  function clearSelectedImages() {
    setSelectedImages([]);
  }

  function exitCamera() {
    setCameraActive(false);
    setZoom(0);
  }

  async function handleStartCamera() {
    if (busy) return;
    if (cameraReady) {
      setCameraActive(true);
      setZoom(0);
      return;
    }

    const response = await requestPermission();
    if (response.granted) {
      setCameraActive(true);
      setZoom(0);
    }
  }

  async function processSelectedImages(images: SelectedScanImage[]) {
    try {
      const processed = await Promise.all(
        images.map(async (image) => {
          const rendered = await ImageManipulator.manipulate(image.uri).resize({ width: 1024 }).renderAsync();
          const saved = await rendered.saveAsync({ compress: 0.6, format: SaveFormat.JPEG, base64: true });
          if (!saved.base64) throw new Error('Kunne ikke behandle bildet.');

          return {
            base64: saved.base64,
            photoUri: `data:image/jpeg;base64,${saved.base64}`,
          };
        })
      );
      const primaryPhotoUri = processed[0]?.photoUri;
      if (!primaryPhotoUri) throw new Error('Kunne ikke behandle bildet.');

      const clientId = await getClientId();
      const apiResult = await scanImages(processed.map((image) => image.base64), {
        clientId,
        imageSources: images.map((image) => image.source),
      });

      if (apiResult.status === 'treff' && apiResult.treff[0]) {
        const [top, ...alternative] = apiResult.treff;
        await addHistoryRecord({ brukerBilde: primaryPhotoUri, treff: top, alternativeTreff: alternative });
        setResult({ kind: 'treff', scanId: apiResult.scanId, photoUri: primaryPhotoUri, treff: top, alternative });
      } else if (apiResult.status === 'usikker') {
        setResult({ kind: 'usikker', scanId: apiResult.scanId, photoUri: primaryPhotoUri, treff: apiResult.treff });
      } else {
        setResult({ kind: 'ikke_skadedyr', scanId: apiResult.scanId, photoUri: primaryPhotoUri });
      }
      clearSelectedImages();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Noe gikk feil. Prøv igjen.';
      setResult({ kind: 'error', message });
    } finally {
      setBusy(false);
      setSheetVisible(true);
    }
  }

  async function handleCapture() {
    if (busy || !canAddImages || !cameraRef.current) return;
    setBusy(true);
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 }).catch(() => null);
    setBusy(false);
    if (!photo?.uri) {
      setResult({ kind: 'error', message: 'Noe gikk feil. Prøv igjen.' });
      setSheetVisible(true);
      return;
    }
    addSelectedUris([photo.uri], 'camera');
    exitCamera();
  }

  async function handlePickImage() {
    if (busy || !canAddImages) return;
    try {
      const remaining = MAX_SCAN_IMAGES - selectedImages.length;
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        orderedSelection: true,
      });
      if (picked.canceled) return;
      const uris = picked.assets.slice(0, remaining).map((asset) => asset.uri);
      if (uris.length === 0) return;
      addSelectedUris(uris, 'library');
      exitCamera();
    } catch {
      setResult({ kind: 'error', message: 'Kunne ikke åpne bildevelgeren. Prøv igjen.' });
      setSheetVisible(true);
    }
  }

  function handleAnalyzeSelectedImages() {
    if (busy || selectedImages.length === 0) return;
    setBusy(true);
    processSelectedImages([...selectedImages]);
  }

  async function handleRetakeLatest() {
    if (busy || selectedImages.length === 0) return;
    if (!cameraReady) {
      const response = await requestPermission();
      if (!response.granted) return;
    }
    setSelectedImages((current) => current.slice(0, -1));
    setCameraActive(true);
    setZoom(0);
  }

  function closeSheet() {
    setSheetVisible(false);
  }

  return (
    <View style={styles.container}>
      {cameraReady && (showCamera || showEntry) && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          flash={flash}
          zoom={zoom}
        />
      )}

      {showEntry && cameraReady && <View style={styles.entryCameraScrim} />}

      {showEntry && (
        <ScanEntry
          cameraReady={cameraReady}
          webBlocked={webBlocked}
          canAskAgain={permission.canAskAgain}
          onStartCamera={handleStartCamera}
          onOpenSettings={() => Linking.openSettings()}
          onPickImage={handlePickImage}
          insetsBottom={insets.bottom}
        />
      )}

      {showCamera && (
        <View style={[styles.topBar, { top: insets.top + Spacing.sm }]}>
          <Pressable onPress={exitCamera}>
            <GlassPanel variant="card" style={styles.controlButton}>
              <IconSymbol name="xmark" size={20} color={Colors.text} />
            </GlassPanel>
          </Pressable>
          <View style={styles.cameraControlGroup}>
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
        </View>
      )}

      {showCamera && (
        <View style={[styles.zoomControls, { bottom: insets.bottom + 132 }]}>
          {[0, 0.35, 0.7].map((value, index) => (
            <Pressable
              key={value}
              style={[styles.zoomButton, zoom === value && styles.zoomButtonActive]}
              onPress={() => setZoom(value)}>
              <Text style={[styles.zoomButtonText, zoom === value && styles.zoomButtonTextActive]}>
                {index === 0 ? '1x' : index === 1 ? '2x' : '4x'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {showCamera && (
        <View style={[styles.bottomArea, { bottom: insets.bottom + Spacing.xl }]}>
          <Text style={styles.privacyText}>
            Ta ett eller flere bilder av samme funn. Bildene lagres bare lokalt i scan-historikken.
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

      {showReview && (
        <ScanReviewTray
          images={selectedImages}
          canAddImages={canAddImages}
          insetBottom={insets.bottom}
          onAddFromCamera={handleStartCamera}
          onAddFromLibrary={handlePickImage}
          onAnalyze={handleAnalyzeSelectedImages}
          onRetakeLatest={handleRetakeLatest}
          onRemoveImage={removeSelectedImage}
        />
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

function ScanEntry({
  cameraReady,
  webBlocked,
  canAskAgain,
  onStartCamera,
  onOpenSettings,
  onPickImage,
  insetsBottom,
}: {
  cameraReady: boolean;
  webBlocked: boolean;
  canAskAgain: boolean;
  onStartCamera: () => void;
  onOpenSettings: () => void;
  onPickImage: () => void;
  insetsBottom: number;
}) {
  return (
    <View style={[styles.entryContent, { paddingBottom: insetsBottom + Spacing.xl }]}>
      <View style={styles.entryHeader}>
        <PestulusLogo size="md" />
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{cameraReady ? 'Kamera er klart' : 'Klar for scan'}</Text>
        </View>
      </View>

      <View style={styles.entryCopy}>
        <Text style={styles.entryTitle}>Identifiser skadedyr</Text>
        <Text style={styles.entrySubtitle}>
          Start kameraet når du er klar, eller analyser bilder du allerede har.
        </Text>
        {webBlocked && (
          <Text style={styles.entryHelp}>
            Nettleseren har blokkert kamera. Bruk kamera- eller hengelås-ikonet i adressefeltet for å gi tilgang.
          </Text>
        )}
        {!canAskAgain && Platform.OS !== 'web' && (
          <Pressable style={styles.entryTextButton} onPress={onOpenSettings}>
            <Text style={styles.secondaryButtonText}>Åpne innstillinger</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.entryActions}>
        <Pressable style={styles.entryPrimaryButton} onPress={onStartCamera}>
          <View style={styles.entryButtonLeft}>
            <IconSymbol name="camera.fill" size={24} color={Colors.accentText} />
            <Text style={styles.entryPrimaryButtonText}>Start kamera</Text>
          </View>
          <IconSymbol name="chevron.right" size={20} color={Colors.accentText} />
        </Pressable>
        <Pressable style={styles.entrySecondaryButton} onPress={onPickImage}>
          <View style={styles.entryButtonLeft}>
            <IconSymbol name="photo.fill" size={24} color={Colors.accent} />
            <Text style={styles.entrySecondaryButtonText}>Last opp bilde</Text>
          </View>
          <IconSymbol name="chevron.right" size={20} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.entryPrivacy}>Du kan bruke opptil tre bilder for bedre treff.</Text>
      </View>
    </View>
  );
}

function ScanReviewTray({
  images,
  canAddImages,
  insetBottom,
  onAddFromCamera,
  onAddFromLibrary,
  onAnalyze,
  onRetakeLatest,
  onRemoveImage,
}: {
  images: SelectedScanImage[];
  canAddImages: boolean;
  insetBottom: number;
  onAddFromCamera: () => void;
  onAddFromLibrary: () => void;
  onAnalyze: () => void;
  onRetakeLatest: () => void;
  onRemoveImage: (id: string) => void;
}) {
  const count = images.length;

  return (
    <View style={[styles.reviewTray, { paddingBottom: insetBottom + Spacing.md }]}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewTitle}>{count}/3 bilder valgt</Text>
        <Pressable onPress={onRetakeLatest}>
          <Text style={styles.reviewLink}>Ta siste på nytt</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailRow}>
        {images.map((image, index) => (
          <View key={image.id} style={[styles.reviewThumbnailWrap, index === images.length - 1 && styles.reviewThumbnailActive]}>
            <Image source={{ uri: image.uri }} style={styles.reviewThumbnail} contentFit="cover" />
            <Pressable style={styles.removeThumbnailButton} onPress={() => onRemoveImage(image.id)}>
              <IconSymbol name="xmark" size={14} color={Colors.text} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
      <View style={styles.reviewActions}>
        {canAddImages && (
          <View style={styles.reviewAddRow}>
            <Pressable style={styles.reviewSecondaryButton} onPress={onAddFromCamera}>
              <IconSymbol name="camera.fill" size={18} color={Colors.textSecondary} />
              <Text style={styles.reviewSecondaryButtonText}>Ta bilde</Text>
            </Pressable>
            <Pressable style={styles.reviewSecondaryButton} onPress={onAddFromLibrary}>
              <IconSymbol name="photo.fill" size={18} color={Colors.textSecondary} />
              <Text style={styles.reviewSecondaryButtonText}>Last opp</Text>
            </Pressable>
          </View>
        )}
        <Pressable style={styles.reviewPrimaryButton} onPress={onAnalyze}>
          <Text style={styles.primaryButtonText}>
            {count === 1 ? 'Analyser 1 bilde' : `Analyser ${count} bilder`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  const color = confidenceColor(value);
  return (
    <View style={styles.confidenceTrack}>
      <View style={[styles.confidenceFill, { flex: value, backgroundColor: color }]} />
      <View style={{ flex: Math.max(0, 1 - value) }} />
    </View>
  );
}

function ScanResultContent({ result, onClose }: { result: ScanUiResult; onClose: () => void }) {
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [corrected, setCorrected] = useState<Species | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const allSpecies = useAllSpecies();

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
      scanId: result.scanId,
      vote: 'like',
      treff: { navnNo: result.treff.navnNo, navnLatin: result.treff.navnLatin, kategori: result.treff.kategori },
    }).catch(() => {});
  }

  function handleDislike() {
    if (result.kind !== 'treff' || feedback) return;
    setFeedback('dislike');
    setPickerVisible(true);
    sendFeedback({
      scanId: result.scanId,
      vote: 'dislike',
      treff: { navnNo: result.treff.navnNo, navnLatin: result.treff.navnLatin, kategori: result.treff.kategori },
    }).catch(() => {});
  }

  function handleSelectSpecies(species: Species) {
    setPickerVisible(false);
    setCorrected(species);
    if (result.kind !== 'treff') return;
    sendFeedback({
      scanId: result.scanId,
      vote: 'dislike',
      treff: { navnNo: result.treff.navnNo, navnLatin: result.treff.navnLatin, kategori: result.treff.kategori },
      korrigertArtId: species.id,
    }).catch(() => {});
  }

  const excludeIds =
    result.kind === 'treff'
      ? [result.treff.species?.id, ...result.alternative.map((t) => t.species?.id)].filter(
          (id): id is string => typeof id === 'string'
        )
      : [];

  const displayedAlternatives = result.kind === 'treff' ? result.alternative.slice(0, 2) : [];
  const displayedUncertain = result.kind === 'usikker' ? result.treff.slice(0, 3) : [];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
      {/* ─── TREFF ─── */}
      {result.kind === 'treff' && (
        <>
          <View style={styles.sheetHeader}>
            <Image source={{ uri: result.photoUri }} style={styles.thumbnail} />
            <View style={styles.sheetHeaderText}>
              <SpeciesLink
                navnNo={result.treff.navnNo}
                allSpecies={allSpecies}
                style={styles.resultTitle}
                noUnderline
              />
              <Text style={styles.resultLatin}>{result.treff.navnLatin}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
              <IconSymbol name="xmark" size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.metaRow}>
            <CategoryBadge label={result.treff.kategori} />
            <Text style={[styles.confidenceLabel, { color: confidenceColor(result.treff.konfidens) }]}>
              {Math.round(result.treff.konfidens * 100)}% · {confidenceLabel(result.treff.konfidens)}
            </Text>
          </View>

          <ConfidenceMeter value={result.treff.konfidens} />

          {result.treff.species?.kjennetegn && (
            <KjennetegnKort tekst={result.treff.species.kjennetegn} />
          )}

          {result.treff.species?.forveksling && (
            <ForvekslingsKort tekst={result.treff.species.forveksling} allSpecies={allSpecies} />
          )}

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
              <Text style={styles.primaryButtonText}>Se full artsbeskrivelse →</Text>
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

      {/* ─── USIKKER ─── */}
      {result.kind === 'usikker' && (
        <>
          <View style={styles.sheetHeader}>
            <Image source={{ uri: result.photoUri }} style={styles.thumbnail} />
            <View style={styles.sheetHeaderText}>
              <View style={styles.warningBanner}>
                <IconSymbol name="exclamationmark.triangle.fill" size={14} color={Colors.accent} />
                <Text style={styles.warningBannerText}>Usikkert resultat</Text>
              </View>
              <Text style={styles.resultBody}>
                Bildet er vanskelig å identifisere sikkert.
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
              <IconSymbol name="xmark" size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {displayedUncertain[0] && (
            <View>
              <Text style={styles.candidateSectionLabel}>Mest sannsynlig</Text>
              <CandidateRow treff={displayedUncertain[0]} />
            </View>
          )}

          {displayedUncertain.length > 1 && (
            <View>
              <Text style={styles.candidateSectionLabel}>Kan også være</Text>
              {displayedUncertain.slice(1).map((t, index) => (
                <CandidateRow key={`${t.navnNo}-${index}`} treff={t} />
              ))}
            </View>
          )}

          {displayedUncertain[0]?.species?.forveksling && (
            <ForvekslingsKort tekst={displayedUncertain[0].species.forveksling} allSpecies={allSpecies} />
          )}

          <Pressable style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.secondaryButtonText}>Ta nytt bilde</Text>
          </Pressable>
        </>
      )}

      {/* ─── IKKE SKADEDYR ─── */}
      {result.kind === 'ikke_skadedyr' && (
        <>
          <View style={styles.sheetHeader}>
            <Image source={{ uri: result.photoUri }} style={styles.thumbnail} />
            <View style={styles.sheetHeaderText}>
              <Text style={styles.resultTitle}>Ingen skadedyr funnet</Text>
              <Text style={styles.resultBody}>
                Vi fant ikke noe skadedyr i bildet. Prøv å ta bildet nærmere eller med bedre lys.
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
              <IconSymbol name="xmark" size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>
        </>
      )}

      {/* ─── FEIL ─── */}
      {result.kind === 'error' && (
        <>
          <View style={styles.sheetHeader}>
            <View style={[styles.thumbnail, styles.errorIcon]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={26} color={Colors.danger} />
            </View>
            <View style={styles.sheetHeaderText}>
              <Text style={styles.resultTitle}>Noe gikk feil</Text>
              <Text style={styles.resultBody}>{result.message}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
              <IconSymbol name="xmark" size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <Pressable style={styles.primaryButton} onPress={onClose}>
            <Text style={styles.primaryButtonText}>Lukk</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
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
  entryCameraScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 11, 13, 0.7)',
  },
  entryContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    justifyContent: 'space-between',
  },
  entryHeader: {
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.overlay,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  statusText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  entryCopy: {
    gap: Spacing.sm,
  },
  entryTitle: {
    ...Typography.title,
    color: Colors.text,
  },
  entrySubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  entryHelp: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  entryActions: {
    gap: Spacing.md,
  },
  entryPrimaryButton: {
    minHeight: 76,
    borderRadius: Radius.lg,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entrySecondaryButton: {
    minHeight: 72,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  entryPrimaryButtonText: {
    ...Typography.bodyStrong,
    color: Colors.accentText,
  },
  entrySecondaryButtonText: {
    ...Typography.bodyStrong,
    color: Colors.text,
  },
  entryPrivacy: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  entryTextButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
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
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  cameraControlGroup: {
    flexDirection: 'row',
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
  zoomControls: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: Spacing.xs,
    borderRadius: Radius.pill,
    padding: 4,
    backgroundColor: Colors.overlay,
  },
  zoomButton: {
    minWidth: 44,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  zoomButtonActive: {
    backgroundColor: Colors.accent,
  },
  zoomButtonText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  zoomButtonTextActive: {
    color: Colors.accentText,
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
  reviewTray: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.overlay,
    gap: Spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewTitle: {
    ...Typography.bodyStrong,
    color: Colors.text,
  },
  reviewLink: {
    ...Typography.caption,
    color: Colors.accent,
  },
  thumbnailRow: {
    gap: Spacing.sm,
  },
  reviewThumbnailWrap: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  reviewThumbnailActive: {
    borderColor: Colors.accent,
  },
  reviewThumbnail: {
    width: '100%',
    height: '100%',
  },
  removeThumbnailButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.overlay,
  },
  reviewActions: {
    gap: Spacing.sm,
  },
  reviewAddRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  reviewSecondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  reviewSecondaryButtonText: {
    ...Typography.bodyStrong,
    color: Colors.text,
  },
  reviewPrimaryButton: {
    minHeight: 50,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
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
    maxHeight: 540,
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
  confidenceLabel: {
    ...Typography.bodyStrong,
  },
  confidenceText: {
    ...Typography.bodyStrong,
    color: Colors.accent,
  },
  confidenceTrack: {
    flexDirection: 'row',
    height: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  confidenceFill: {
    borderRadius: Radius.pill,
  },
  candidateSectionLabel: {
    ...Typography.label,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
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
