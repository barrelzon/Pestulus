# Scan Entry Design

## Scope
Redesign the Scan tab's initial state before the user enters the full camera experience.

The first Scan view should be a polished, static entry screen with two primary actions:

- Start kamera
- Last opp bilde

This replaces the current behavior where the camera preview is immediately the primary surface whenever permission exists.

## Design Direction
Use the restrained clinical variant:

- Title: `Identifiser skadedyr`
- Supporting text: `Start kameraet når du er klar, eller analyser et bilde du allerede har.`
- Large stacked action buttons near the lower part of the screen.
- Use existing production icons through `IconSymbol`, not custom glyphs:
  - `camera.fill` for Start kamera
  - `photo.fill` for Last opp bilde
  - `chevron.right` at the trailing edge of each action button
- No animated insects, no magnifying glass, and no decorative custom icons.
- Dark theme remains the default, using existing Pestulus tokens.

## Background States
When camera permission is granted and the platform supports preview mounting, the entry screen should mount a camera preview behind the content as a subtle background:

- Camera preview is visually de-emphasized with dark overlay and blur/glass layers.
- It must not look like the active camera capture interface.
- User-facing copy should make clear that no image is saved until analysis starts.

When permission is not granted, or when preview mounting is unavailable, use a static dark fallback background with the same layout and actions.

## Interaction Flow
Initial Scan tab:

1. Show the entry screen.
2. `Start kamera` requests permission if needed.
3. If permission is granted, transition into the existing full camera capture state.
4. `Last opp bilde` opens the image picker directly.
5. Users can collect one to three images before analysis.
6. Existing result sheet, feedback, and history behavior remain visually unchanged, but scan processing must support the multi-image payload described below.

## Multi-Image Capture
Each scan can contain a maximum of three images.

Users can build a scan set from camera captures, uploaded images, or a mix of both. The UI should always make the current image count clear:

- `1/3`, `2/3`, or `3/3` near the thumbnail strip.
- Primary action text changes with count: `Analyser 1 bilde`, `Analyser 2 bilder`, `Analyser 3 bilder`.
- When three images are selected, disable or hide add-more controls.

Image picker uploads should enable multi-select where supported, with a selection limit of three. If the scan set already contains images, the picker should only allow the remaining number of images.

Camera capture adds one image at a time. After capture, the user returns to a compact review state instead of a full-screen preview.

## Compact Review State
After a camera capture or upload, the preview must not cover the whole screen.

Use a compact review layout:

- Keep the camera or dark background visible.
- Show selected images as thumbnails in a horizontal strip.
- Highlight the most recent image.
- Provide controls to remove an image, add another image, retake the most recent capture, and analyze the current set.
- Do not analyze automatically after capture; the user chooses when the scan set is ready.

The result sheet should display the first selected image as the main thumbnail for history/result continuity. Future work can expand history to show all submitted images.

## Camera Zoom
The full camera capture state should support zoom.

Use Expo Camera's `zoom` value from `0` to `1`. The initial implementation should include a restrained on-screen zoom slider or segmented control that is easy to use with one hand. Pinch zoom can be added if it fits cleanly with existing gesture dependencies, but it is not required for the first implementation.

Zoom should reset to `0` when leaving the camera capture state.

## Backend Scan Contract
Backend `/scan` must accept both the current single-image body and the new multi-image body during the transition:

- Existing: `{ imageBase64: string }`
- New: `{ imageBase64List: string[] }`

The backend validates that `imageBase64List` contains one to three valid images. It passes all images to the vision adapter in one model request so the model can use multiple views of the same specimen as evidence.

The response shape stays unchanged:

`{ status, treff }`

This keeps the client result rendering stable.

## Error And Permission Handling
If camera access is denied or blocked:

- Keep the entry layout instead of showing a separate dense permission card.
- Show concise Norwegian helper text.
- On web, explain that camera access can be changed from the browser address bar if blocked.
- On native, keep the existing path to open system settings when permission cannot be requested again.
- The upload action remains available.

## Accessibility
Buttons must have clear accessible labels and large touch targets.

The background camera preview is decorative in the entry state and should not introduce extra screen reader noise.

Respect reduced motion by keeping this entry state static. No animation is planned.

## Testing
Verify these states:

- First visit before permission.
- Permission granted before opening camera.
- Permission denied on web.
- Permission denied and cannot ask again on native.
- Upload flow allows selecting up to three images where supported.
- Upload flow respects remaining slots when images are already selected.
- Start camera reaches the capture UI.
- Camera zoom changes the preview and resets after leaving capture.
- Captured/uploaded images show in compact review instead of full-screen preview.
- Removing images updates count and analyze button state.
- Existing result sheet behavior still works after single-image and multi-image scans.

## Non-Goals
Do not redesign the scan result sheet.

Do not redesign History storage beyond continuing to save the first submitted image as the representative scan image.

Do not add custom icon drawings, animated insects, or a magnifying glass animation.
