# Scan Entry Multi-Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved Scan flow: static clinical entry screen, finished icons, camera zoom, compact post-capture review, and one-to-three-image scan requests.

**Architecture:** Keep the backend response shape stable while extending `/scan` to accept either one image or an image list. On the client, keep result rendering mostly unchanged and introduce a small scan-set state around the existing camera/upload flow. The Scan screen remains the main integration point, with helper code for API payloads and backend input validation.

**Tech Stack:** Expo SDK 54, React Native, Expo Router, `expo-camera`, `expo-image-picker`, `expo-image-manipulator`, Express, TypeScript strict, Gemini vision adapter.

---

## File Structure

- Modify `backend/src/lib/vision.ts`: accept one-to-three image payloads and send all images as inline image parts in the same Gemini request.
- Create `backend/src/lib/scan-input.ts`: validate legacy `{ imageBase64 }` and new `{ imageBase64List }` request bodies.
- Create `backend/src/lib/scan-input.test.ts`: Node test coverage for scan request validation.
- Modify `backend/src/routes/scan.ts`: use `parseScanImages()` and pass the image list to `identifyPest()`.
- Modify `backend/package.json`: add a focused `test` script for backend Node tests.
- Modify `app/lib/api.ts`: add `scanImages(imageBase64List)` while keeping `scanImage(imageBase64)` as a compatibility wrapper.
- Read `app/components/ui/icon-symbol.tsx`: confirm the existing `chevron.right` Material fallback mapping remains available.
- Modify `app/app/(tabs)/index.tsx`: implement entry screen, camera mode, compact review tray, multi-image selection, zoom controls, and multi-image processing.

## Task 1: Backend Scan Input Validator

**Files:**
- Create: `backend/src/lib/scan-input.ts`
- Create: `backend/src/lib/scan-input.test.ts`
- Modify: `backend/package.json`

- [ ] **Step 1: Add backend test script**

Update `backend/package.json` scripts to include `test`:

```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "build": "tsc -p tsconfig.json",
  "start": "node dist/server.js",
  "test": "node --import tsx --test \"src/**/*.test.ts\""
}
```

- [ ] **Step 2: Write failing validator tests**

Create `backend/src/lib/scan-input.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { parseScanImages } from "./scan-input.js";

const validImage = "a".repeat(120);

test("accepts legacy single image body", () => {
  assert.deepEqual(parseScanImages({ imageBase64: validImage }), [validImage]);
});

test("accepts one to three images in imageBase64List", () => {
  assert.deepEqual(parseScanImages({ imageBase64List: [validImage] }), [validImage]);
  assert.deepEqual(parseScanImages({ imageBase64List: [validImage, validImage, validImage] }), [
    validImage,
    validImage,
    validImage,
  ]);
});

test("rejects missing images", () => {
  assert.throws(() => parseScanImages({}), /Mangler gyldig bilde/);
});

test("rejects too many images", () => {
  assert.throws(
    () => parseScanImages({ imageBase64List: [validImage, validImage, validImage, validImage] }),
    /Maks 3 bilder/,
  );
});

test("rejects short or non-string images", () => {
  assert.throws(() => parseScanImages({ imageBase64: "short" }), /Mangler gyldig bilde/);
  assert.throws(() => parseScanImages({ imageBase64List: [validImage, 42] }), /Mangler gyldig bilde/);
});
```

- [ ] **Step 3: Run test and verify failure**

Run:

```bash
cd backend
npm test -- --test-name-pattern "accepts legacy"
```

Expected: FAIL because `backend/src/lib/scan-input.ts` does not exist.

- [ ] **Step 4: Implement validator**

Create `backend/src/lib/scan-input.ts`:

```ts
const MAX_SCAN_IMAGES = 3;
const MIN_BASE64_LENGTH = 100;

function isValidImageBase64(value: unknown): value is string {
  return typeof value === "string" && value.length >= MIN_BASE64_LENGTH;
}

export function parseScanImages(body: unknown): string[] {
  const payload = body as { imageBase64?: unknown; imageBase64List?: unknown };

  if (Array.isArray(payload.imageBase64List)) {
    if (payload.imageBase64List.length < 1) {
      throw new Error("Mangler gyldig bilde");
    }
    if (payload.imageBase64List.length > MAX_SCAN_IMAGES) {
      throw new Error("Maks 3 bilder per scan");
    }
    if (!payload.imageBase64List.every(isValidImageBase64)) {
      throw new Error("Mangler gyldig bilde");
    }
    return payload.imageBase64List;
  }

  if (isValidImageBase64(payload.imageBase64)) {
    return [payload.imageBase64];
  }

  throw new Error("Mangler gyldig bilde");
}
```

- [ ] **Step 5: Run validator tests**

Run:

```bash
cd backend
npm test -- --test-name-pattern "image|rejects|accepts"
```

Expected: PASS for all tests in `scan-input.test.ts`.

- [ ] **Step 6: Commit backend validator**

```bash
git add backend/package.json backend/src/lib/scan-input.ts backend/src/lib/scan-input.test.ts
git commit -m "Add scan image input validation"
```

## Task 2: Backend Multi-Image Vision Request

**Files:**
- Modify: `backend/src/lib/vision.ts`
- Modify: `backend/src/routes/scan.ts`

- [ ] **Step 1: Update route to use validator**

In `backend/src/routes/scan.ts`, replace the current single-image validation with:

```ts
import { parseScanImages } from "../lib/scan-input.js";
```

Inside the route handler:

```ts
let imageBase64List: string[];
try {
  imageBase64List = parseScanImages(req.body);
} catch (err) {
  const message = err instanceof Error ? err.message : "Mangler gyldig bilde";
  return res.status(400).json({ error: message });
}
```

Then call:

```ts
const result = await identifyPest(imageBase64List, candidates);
```

- [ ] **Step 2: Update vision function signatures**

In `backend/src/lib/vision.ts`, change signatures from `imageBase64: string` to `imageBase64List: string[]`:

```ts
async function callModel(
  systemPrompt: string,
  imageBase64List: string[],
  responseSchema: unknown,
): Promise<string> {
```

```ts
async function identifyCategory(
  imageBase64List: string[],
  candidates: Candidate[],
): Promise<string | null> {
```

```ts
async function identifySpecies(
  imageBase64List: string[],
  candidates: Candidate[],
): Promise<VisionResult> {
```

```ts
export async function identifyPest(
  imageBase64List: string[],
  candidates: Candidate[],
): Promise<VisionResult> {
```

- [ ] **Step 3: Send all images to Gemini**

In `callModel()`, build the user parts as text plus one inline image per base64 string:

```ts
const imageParts = imageBase64List.map((imageBase64) => ({
  inlineData: { mimeType: "image/jpeg", data: imageBase64 },
}));
```

Use the parts in the request body:

```ts
contents: [
  {
    role: "user",
    parts: [
      {
        text:
          imageBase64List.length === 1
            ? "Hvilken art viser dette bildet?"
            : `Hvilken art viser disse ${imageBase64List.length} bildene? Bildene viser samme funn fra ulike vinkler. Bruk samlet visuell informasjon.`,
      },
      ...imageParts,
    ],
  },
],
```

- [ ] **Step 4: Thread image list through category and species calls**

Update calls in `identifyCategory()`, `identifySpecies()`, and `identifyPest()`:

```ts
const raw = await callModel(prompt, imageBase64List, CATEGORY_SCHEMA);
```

```ts
const raw = await callModel(prompt, imageBase64List, SPECIES_SCHEMA);
```

```ts
const kategori = await identifyCategory(imageBase64List, candidates);
```

```ts
const result = await identifySpecies(imageBase64List, finalCandidates);
```

- [ ] **Step 5: Run backend verification**

Run:

```bash
cd backend
npm test
npm run build
```

Expected: tests pass and TypeScript build succeeds.

- [ ] **Step 6: Commit backend multi-image support**

```bash
git add backend/src/lib/vision.ts backend/src/routes/scan.ts
git commit -m "Support multi-image scan requests"
```

## Task 3: Client API Multi-Image Wrapper

**Files:**
- Modify: `app/lib/api.ts`

- [ ] **Step 1: Add multi-image API function**

In `app/lib/api.ts`, replace the existing `scanImage()` implementation with:

```ts
export function scanImages(imageBase64List: string[]): Promise<ScanResult> {
  return request<ScanResult>('/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64List }),
  });
}

export function scanImage(imageBase64: string): Promise<ScanResult> {
  return scanImages([imageBase64]);
}
```

- [ ] **Step 2: Run app type/lint check**

Run:

```bash
cd app
npm run lint
```

Expected: no new lint errors from `app/lib/api.ts`.

- [ ] **Step 3: Commit client API**

```bash
git add app/lib/api.ts
git commit -m "Add multi-image scan API client"
```

## Task 4: Scan Screen State Model

**Files:**
- Modify: `app/app/(tabs)/index.tsx`

- [ ] **Step 1: Replace single pending URI state with scan image list**

In `ScanScreen`, replace:

```ts
const [pendingUri, setPendingUri] = useState<string | null>(null);
```

with:

```ts
type SelectedScanImage = {
  id: string;
  uri: string;
};

const MAX_SCAN_IMAGES = 3;

const [selectedImages, setSelectedImages] = useState<SelectedScanImage[]>([]);
const [cameraActive, setCameraActive] = useState(false);
const [zoom, setZoom] = useState(0);
```

- [ ] **Step 2: Add scan image helper functions**

Inside `ScanScreen`, add:

```ts
function makeScanImage(uri: string): SelectedScanImage {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, uri };
}

function addSelectedUris(uris: string[]) {
  setSelectedImages((current) => {
    const remaining = MAX_SCAN_IMAGES - current.length;
    const additions = uris.slice(0, remaining).map(makeScanImage);
    return [...current, ...additions];
  });
}

function removeSelectedImage(id: string) {
  setSelectedImages((current) => current.filter((image) => image.id !== id));
}

function clearSelectedImages() {
  setSelectedImages([]);
}
```

- [ ] **Step 3: Replace `processImage` with `processSelectedImages`**

Replace the current `processImage(uri: string)` with:

```ts
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

    const apiResult = await scanImages(processed.map((image) => image.base64));
    const primaryPhotoUri = processed[0]?.photoUri;
    if (!primaryPhotoUri) throw new Error('Kunne ikke behandle bildet.');

    if (apiResult.status === 'treff' && apiResult.treff[0]) {
      const [top, ...alternative] = apiResult.treff;
      await addHistoryRecord({ brukerBilde: primaryPhotoUri, treff: top, alternativeTreff: alternative });
      setResult({ kind: 'treff', photoUri: primaryPhotoUri, treff: top, alternative });
    } else if (apiResult.status === 'usikker') {
      setResult({ kind: 'usikker', photoUri: primaryPhotoUri, treff: apiResult.treff });
    } else {
      setResult({ kind: 'ikke_skadedyr', photoUri: primaryPhotoUri });
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
```

Also update imports from `@/lib/api`:

```ts
import { ApiError, scanImages, sendFeedback, type Species, type Treff } from '@/lib/api';
```

- [ ] **Step 4: Run app lint**

Run:

```bash
cd app
npm run lint
```

Expected: lint may fail until UI call sites are updated in the next task. Confirm the failures reference removed `pendingUri`, `processImage`, or `handleConfirm` call sites.

## Task 5: Scan Entry, Camera Zoom, And Compact Review UI

**Files:**
- Modify: `app/app/(tabs)/index.tsx`
- Read: `app/components/ui/icon-symbol.tsx`

- [ ] **Step 1: Confirm `chevron.right` icon exists**

Verify `app/components/ui/icon-symbol.tsx` contains:

```ts
'chevron.right': 'chevron-right',
```

- [ ] **Step 2: Update camera visibility state**

Replace:

```ts
const showCamera = cameraReady && !pendingUri && !sheetVisible;
```

with:

```ts
const hasSelectedImages = selectedImages.length > 0;
const canAddImages = selectedImages.length < MAX_SCAN_IMAGES;
const showCamera = cameraReady && cameraActive && !sheetVisible;
const showEntry = !cameraActive && !sheetVisible;
const showReview = hasSelectedImages && !sheetVisible;
```

- [ ] **Step 3: Update `CameraView` props**

Render `CameraView` only when `cameraReady` and either entry background or active camera is needed:

```tsx
{cameraReady && (
  <CameraView
    ref={cameraRef}
    style={StyleSheet.absoluteFill}
    facing={facing}
    flash={flash}
    zoom={zoom}
  />
)}
```

Add a dark overlay when `showEntry` is true:

```tsx
{showEntry && cameraReady && <View style={styles.entryCameraScrim} />}
```

- [ ] **Step 4: Add entry screen component**

Create a local component in `index.tsx`:

```tsx
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
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{cameraReady ? 'Kamera er klart' : 'Klar for scan'}</Text>
        </View>
      </View>
      <View style={styles.entryCopy}>
        <Text style={styles.entryTitle}>Identifiser skadedyr</Text>
        <Text style={styles.entrySubtitle}>
          Start kameraet når du er klar, eller analyser et bilde du allerede har.
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
        <Text style={styles.entryPrivacy}>Ingen bilder lagres uten at du starter en analyse.</Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 5: Replace permission card rendering with entry rendering**

Remove the old `permissionCard` branch and render:

```tsx
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
```

Add handler:

```ts
async function handleStartCamera() {
  if (cameraReady) {
    setCameraActive(true);
    return;
  }
  const response = await requestPermission();
  if (response.granted) {
    setCameraActive(true);
  }
}
```

- [ ] **Step 6: Update capture and upload handlers**

Replace `handleCapture()` ending:

```ts
if (photo?.uri) {
  addSelectedUris([photo.uri]);
}
```

Update `handlePickImage()`:

```ts
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
    addSelectedUris(picked.assets.slice(0, remaining).map((asset) => asset.uri));
  } catch {
    setResult({ kind: 'error', message: 'Kunne ikke åpne bildevelgeren. Prøv igjen.' });
    setSheetVisible(true);
  }
}
```

- [ ] **Step 7: Add analyze handler**

Add:

```ts
function handleAnalyzeSelectedImages() {
  if (busy || selectedImages.length === 0) return;
  setBusy(true);
  processSelectedImages(selectedImages);
}
```

Add:

```ts
function handleRetakeLatest() {
  setSelectedImages((current) => current.slice(0, -1));
  setCameraActive(true);
}
```

- [ ] **Step 8: Add zoom controls**

In camera mode, render:

```tsx
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
```

Reset zoom when leaving camera:

```ts
function exitCamera() {
  setCameraActive(false);
  setZoom(0);
}
```

- [ ] **Step 9: Add compact review tray**

Create local component:

```tsx
function ScanReviewTray({
  images,
  canAddImages,
  insetBottom,
  onAddImage,
  onAnalyze,
  onRetakeLatest,
  onRemoveImage,
}: {
  images: SelectedScanImage[];
  canAddImages: boolean;
  insetBottom: number;
  onAddImage: () => void;
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
          <Pressable style={styles.reviewSecondaryButton} onPress={onAddImage}>
            <Text style={styles.reviewSecondaryButtonText}>Legg til bilde</Text>
          </Pressable>
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
```

Render:

```tsx
{showReview && (
  <ScanReviewTray
    images={selectedImages}
    canAddImages={canAddImages}
    insetBottom={insets.bottom}
    onAddImage={handlePickImage}
    onAnalyze={handleAnalyzeSelectedImages}
    onRetakeLatest={handleRetakeLatest}
    onRemoveImage={removeSelectedImage}
  />
)}
```

- [ ] **Step 10: Remove full-screen confirmation overlay**

Delete `ConfirmationOverlay` and all `pendingUri`, `handleConfirm`, and old `handleRetake` references.

- [ ] **Step 11: Add styles**

Add styles used above:

```ts
entryCameraScrim: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(10, 11, 13, 0.68)',
},
entryContent: {
  flex: 1,
  paddingHorizontal: Spacing.lg,
  paddingTop: Spacing.xl,
  justifyContent: 'space-between',
},
entryHeader: {
  alignItems: 'flex-start',
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
  minHeight: 72,
  borderRadius: Radius.lg,
  backgroundColor: Colors.accent,
  paddingHorizontal: Spacing.lg,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
entrySecondaryButton: {
  minHeight: 68,
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
  flexDirection: 'row',
  gap: Spacing.sm,
},
reviewSecondaryButton: {
  flex: 1,
  minHeight: 48,
  borderRadius: Radius.pill,
  borderWidth: 1,
  borderColor: Colors.border,
  alignItems: 'center',
  justifyContent: 'center',
},
reviewSecondaryButtonText: {
  ...Typography.bodyStrong,
  color: Colors.text,
},
reviewPrimaryButton: {
  flex: 1,
  minHeight: 48,
  borderRadius: Radius.pill,
  backgroundColor: Colors.accent,
  alignItems: 'center',
  justifyContent: 'center',
},
```

- [ ] **Step 12: Run app lint and fix type issues**

Run:

```bash
cd app
npm run lint
```

Expected: PASS. If lint reports an issue in `app/app/(tabs)/index.tsx`, update the Scan screen code in this task and rerun `npm run lint` until it passes.

- [ ] **Step 13: Commit Scan UI**

```bash
git add app/app/(tabs)/index.tsx
git commit -m "Update scan flow for entry and multi-image review"
```

## Task 6: End-To-End Verification

**Files:**
- Read: `backend/package.json`
- Read: `app/package.json`

- [ ] **Step 1: Build backend**

Run:

```bash
cd backend
npm test
npm run build
```

Expected: tests pass and build succeeds.

- [ ] **Step 2: Lint app**

Run:

```bash
cd app
npm run lint
```

Expected: lint passes.

- [ ] **Step 3: Run web smoke test manually**

Run:

```bash
cd app
npx expo start --web
```

Expected manual checks:

- Initial Scan tab shows `Identifiser skadedyr`.
- Buttons use finished `IconSymbol` icons, not custom glyphs.
- `Last opp bilde` allows choosing images and shows compact thumbnail review.
- Adding images stops at three.
- Removing thumbnails updates `1/3`, `2/3`, `3/3`.
- `Start kamera` opens the full camera state if permission is available.
- Zoom buttons update camera preview without layout jumps.
- Capturing a photo returns to compact review, not full-screen preview.

- [ ] **Step 4: Stop dev server and check git status**

Run:

```bash
git status --short
```

Expected: clean working tree after all task commits.
