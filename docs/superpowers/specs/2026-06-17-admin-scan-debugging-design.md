# Admin Scan Debugging Design

## Goal

Extend the v1 admin dashboard so it can debug individual scans, not only aggregate vote counts.

## Decisions

- Add a unique `scanId` for every scan.
- Add an anonymous `clientId` generated in the app and stored locally on the device/browser.
- Link feedback votes to the `scanId` when feedback is sent from a result sheet.
- Log all returned AI result candidates for each scan, not only the top result.
- Save the already-compressed scan images received by the backend as admin-only dev artifacts.
- Show scan thumbnails, image count, source, top species, and candidate confidence values in admin.
- Add an admin reset action that clears scan logs, feedback logs, and saved admin scan images.

## Privacy Boundary

This is accepted for dev/v1 because the app is not official yet. Backend still must not log original device files, full-quality originals, IP addresses, names, email, GPS, or other direct identity fields. Saved images are the compressed base64 images already submitted for AI analysis.

## Backend

- `/scan` generates `scanId`, stores compressed images under `backend/src/data/admin-scan-images`, logs scan metadata and candidates, and returns `scanId` to the client.
- `/feedback` accepts optional `scanId` and logs it.
- `/admin/stats` returns recent scans with image URLs and candidate result arrays.
- `/admin/images/:fileName` serves saved scan images only when an admin token is supplied.
- `/admin/reset` clears logs and admin scan images.

## Client

- `scanImages()` sends `clientId` and per-image sources.
- Result state keeps `scanId`.
- Feedback payloads include `scanId`.
- Admin dashboard has a reset confirmation flow.
- Admin scan rows show thumbnails and candidate confidence values.
