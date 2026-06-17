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
5. Existing image confirmation, processing, result sheet, feedback, and history behavior remain unchanged.

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
- Upload flow still opens image picker.
- Start camera still reaches the existing capture UI.
- Existing result sheet behavior still works after capture and upload.

## Non-Goals
Do not redesign the scan result sheet.

Do not change backend scan behavior.

Do not add custom icon drawings, animated insects, or a magnifying glass animation.
