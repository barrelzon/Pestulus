# Admin Scan Debugging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reset support and richer per-scan debugging data to the admin dashboard.

**Architecture:** The backend generates scan IDs, stores compressed scan images, logs scan candidates and anonymous client IDs, and exposes protected admin image/reset endpoints. The app generates a persistent anonymous client ID, sends scan metadata, links feedback to scans, and renders scan thumbnails and candidate confidence values in admin.

**Tech Stack:** Node + Express + TypeScript strict, JSONL file logs, Expo AsyncStorage, Expo Router, React Native Web.

---

## File Structure

- Modify `backend/src/lib/activity-log.ts`: add richer scan/feedback log types, image saving, reset helper.
- Modify `backend/src/lib/admin-stats.ts`: preserve richer scan entries and feedback scan IDs in stats.
- Modify `backend/src/lib/admin-stats.test.ts`: cover candidate lists and scan IDs.
- Modify `backend/src/lib/scan-input.ts`: parse `clientId` and `imageSources`.
- Modify `backend/src/lib/scan-input.test.ts`: test metadata parsing.
- Modify `backend/src/routes/scan.ts`: generate `scanId`, save images, log candidates, return `scanId`.
- Modify `backend/src/routes/feedback.ts`: accept optional `scanId`.
- Modify `backend/src/routes/admin.ts`: add image route and reset route.
- Modify `app/lib/api.ts`: add admin reset, scan metadata, image URL types.
- Create `app/lib/client-id.ts`: persistent anonymous client ID.
- Modify `app/app/(tabs)/index.tsx`: track image sources, keep `scanId`, send feedback with scan ID.
- Modify `app/app/admin.tsx`: render reset controls, images, scan IDs, client IDs, and result candidates.

## Tasks

- [ ] Add backend scan metadata/image/reset helpers and tests.
- [ ] Integrate scan ID, image saving, reset route, and feedback scan linking in backend.
- [ ] Add client ID generation and send scan metadata from the app.
- [ ] Update admin dashboard UI for reset, images, scan IDs, client IDs, and candidate confidence.
- [ ] Run backend tests/build, app lint/typecheck, and browser smoke.
