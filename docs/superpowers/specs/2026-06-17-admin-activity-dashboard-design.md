# Admin Activity Dashboard Design

## Goal

Add a hidden, password-protected admin dashboard for v1 operational insight into scans and feedback votes.

## Scope

This v1 is intentionally small:

- Hidden `/admin` route in the Expo app, with no link in the visible navigation.
- Admin login using a single backend environment variable: `ADMIN_PASSWORD`.
- Backend admin API for login and activity stats.
- JSONL file logging for scan metadata and feedback votes.
- Dashboard cards and recent activity tables for scans, votes, and likely problem species.

This is not a production-grade auth or analytics system. The hidden route is only discoverability friction; the actual protection is the backend password check. Local log files are acceptable for v1, but Render may lose them on restart or deploy unless persistent disk is configured.

## Backend Design

Create a small logging module that writes newline-delimited JSON records:

- `backend/src/data/scan-events.log`
- `backend/src/data/feedback.log`

Scan logging records:

- `tidspunkt`
- `status`
- `imageCount`
- top result summary: `navnNo`, `navnLatin`, `kategori`, `konfidens`

Feedback logging records:

- `tidspunkt`
- `vote`
- predicted `treff`
- optional `korrigertArtId`

No user images or base64 payloads are logged.

Create `backend/src/routes/admin.ts`:

- `POST /admin/login` accepts `{ password }`.
- If `ADMIN_PASSWORD` is unset, return `503`.
- If password is wrong, return `401`.
- On success, return a deterministic bearer token derived from `ADMIN_PASSWORD` with Node `crypto`.
- `GET /admin/stats` requires `Authorization: Bearer <token>`.
- Stats are aggregated from JSONL logs each request.

The admin stats response contains:

- totals for scans and feedback
- scan status counts
- feedback vote counts
- most disliked predicted species
- recent scan entries
- recent feedback entries with corrected species name where available

## Client Design

Add an Expo Router screen at `app/app/admin.tsx`.

The route is not added to the tab layout or any visible navigation. Admins open it manually at `/admin`.

The screen has two states:

- Login form with password input and a compact explanation.
- Dashboard after login, using bearer token stored in component state only.

The dashboard shows:

- metric cards for total scans, hits, uncertain, not pest, right votes, wrong votes
- list of most disliked predicted species
- recent scans
- recent votes

Use existing dark theme tokens and keep the layout practical, not marketing-like.

## Error Handling

- Missing `ADMIN_PASSWORD`: show that admin is not configured.
- Wrong password: show login error.
- Failed stats request: show retry affordance.
- Malformed log lines are ignored so one bad log entry does not break the dashboard.

## Testing

Backend:

- Unit tests for admin auth and stats aggregation helpers.
- Existing backend test command must pass.
- Backend TypeScript build must pass.

App:

- `npm run lint`
- `npx tsc --noEmit`
- Web smoke: `/admin` renders login, bad password fails if backend is configured, successful token can fetch stats when local env is set.
