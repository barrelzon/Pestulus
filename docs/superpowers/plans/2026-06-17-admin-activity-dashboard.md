# Admin Activity Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hidden password-protected admin dashboard that shows scan activity and like/dislike feedback.

**Architecture:** Keep admin auth in the backend using `ADMIN_PASSWORD` and a deterministic bearer token. Log scan and feedback metadata as JSONL files, aggregate them on demand in `/admin/stats`, and add a hidden Expo Router `/admin` screen that consumes the admin API.

**Tech Stack:** Node + Express + TypeScript strict, Node `crypto`, JSONL file logs, Expo Router, React Native Web.

---

## File Structure

- Modify `AGENTS.md`: add the hidden-link security rule.
- Create `backend/src/lib/activity-log.ts`: shared JSONL log paths, append/read helpers, scan/feedback event types.
- Create `backend/src/lib/admin-stats.ts`: pure aggregation helper for scan and feedback stats.
- Create `backend/src/lib/admin-stats.test.ts`: tests for stats aggregation and malformed log tolerance.
- Create `backend/src/routes/admin.ts`: login and stats routes.
- Modify `backend/src/routes/scan.ts`: log scan metadata after model result.
- Modify `backend/src/routes/feedback.ts`: use shared feedback log helper.
- Modify `backend/src/server.ts`: mount `/admin`.
- Modify `app/lib/api.ts`: add admin API types and functions.
- Modify `app/components/ui/icon-symbol.tsx`: add admin screen icon mappings used by the page.
- Create `app/app/admin.tsx`: hidden admin login/dashboard screen.

## Task 1: Backend Activity Log And Stats Aggregation

**Files:**
- Create: `backend/src/lib/activity-log.ts`
- Create: `backend/src/lib/admin-stats.ts`
- Create: `backend/src/lib/admin-stats.test.ts`

- [ ] **Step 1: Create failing aggregation tests**

Create `backend/src/lib/admin-stats.test.ts` with tests that import `buildAdminStats` from `./admin-stats.js`. Cover:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { buildAdminStats } from "./admin-stats.js";
import type { FeedbackLogEntry, ScanLogEntry } from "./activity-log.js";

const scans: ScanLogEntry[] = [
  { tidspunkt: "2026-06-17T20:00:00.000Z", status: "treff", imageCount: 2, topTreff: { navnNo: "Veggedyr", navnLatin: "Cimex lectularius", kategori: "Veggedyr og andre teger", konfidens: 0.91 } },
  { tidspunkt: "2026-06-17T20:01:00.000Z", status: "usikker", imageCount: 1, topTreff: { navnNo: "Brunrotte", navnLatin: "Rattus norvegicus", kategori: "Gnagere", konfidens: 0.52 } },
  { tidspunkt: "2026-06-17T20:02:00.000Z", status: "ikke_skadedyr", imageCount: 1, topTreff: null },
];

const feedback: FeedbackLogEntry[] = [
  { tidspunkt: "2026-06-17T20:03:00.000Z", vote: "like", treff: { navnNo: "Veggedyr", navnLatin: "Cimex lectularius", kategori: "Veggedyr og andre teger" }, korrigertArtId: null },
  { tidspunkt: "2026-06-17T20:04:00.000Z", vote: "dislike", treff: { navnNo: "Brunrotte", navnLatin: "Rattus norvegicus", kategori: "Gnagere" }, korrigertArtId: "svartrotte" },
  { tidspunkt: "2026-06-17T20:05:00.000Z", vote: "dislike", treff: { navnNo: "Brunrotte", navnLatin: "Rattus norvegicus", kategori: "Gnagere" }, korrigertArtId: null },
];

test("aggregates scan and feedback totals", () => {
  const stats = buildAdminStats(scans, feedback, [{ id: "svartrotte", navnNo: "Svartrotte" }]);
  assert.equal(stats.totals.scans, 3);
  assert.equal(stats.totals.feedback, 3);
  assert.equal(stats.scanStatus.treff, 1);
  assert.equal(stats.scanStatus.usikker, 1);
  assert.equal(stats.scanStatus.ikke_skadedyr, 1);
  assert.equal(stats.feedbackVotes.like, 1);
  assert.equal(stats.feedbackVotes.dislike, 2);
  assert.deepEqual(stats.mostDisliked[0], { navnNo: "Brunrotte", kategori: "Gnagere", count: 2 });
  assert.equal(stats.recentFeedback[0]?.correctedSpeciesName, null);
  assert.equal(stats.recentFeedback[1]?.correctedSpeciesName, "Svartrotte");
});
```

Run `cd backend && npm test -- --test-name-pattern "aggregates scan"` and verify it fails because `admin-stats.ts` does not exist.

- [ ] **Step 2: Implement log types and helpers**

Create `backend/src/lib/activity-log.ts` with:

```ts
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Treff, VisionStatus } from "./vision.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../data");
export const SCAN_EVENTS_LOG = path.join(DATA_DIR, "scan-events.log");
export const FEEDBACK_LOG = path.join(DATA_DIR, "feedback.log");

export type ScanLogEntry = {
  tidspunkt: string;
  status: VisionStatus;
  imageCount: number;
  topTreff: Pick<Treff, "navnNo" | "navnLatin" | "kategori" | "konfidens"> | null;
};

export type FeedbackLogEntry = {
  tidspunkt: string;
  vote: "like" | "dislike";
  treff: { navnNo: string; navnLatin: string; kategori: string };
  korrigertArtId: string | null;
};

export async function appendJsonLine(filePath: string, entry: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf8");
}

export async function readJsonLines<T>(filePath: string, isEntry: (value: unknown) => value is T): Promise<T[]> {
  const raw = await fs.readFile(filePath, "utf8").catch((err: unknown) => {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") return "";
    throw err;
  });
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as unknown;
      } catch {
        return null;
      }
    })
    .filter(isEntry);
}

export function isScanLogEntry(value: unknown): value is ScanLogEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<ScanLogEntry>;
  return (
    typeof entry.tidspunkt === "string" &&
    (entry.status === "treff" || entry.status === "usikker" || entry.status === "ikke_skadedyr") &&
    typeof entry.imageCount === "number" &&
    (entry.topTreff === null || typeof entry.topTreff === "object")
  );
}

export function isFeedbackLogEntry(value: unknown): value is FeedbackLogEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<FeedbackLogEntry>;
  return (
    typeof entry.tidspunkt === "string" &&
    (entry.vote === "like" || entry.vote === "dislike") &&
    !!entry.treff &&
    typeof entry.treff.navnNo === "string" &&
    typeof entry.treff.navnLatin === "string" &&
    typeof entry.treff.kategori === "string" &&
    (entry.korrigertArtId === null || typeof entry.korrigertArtId === "string")
  );
}

export function logScanEvent(entry: ScanLogEntry): Promise<void> {
  return appendJsonLine(SCAN_EVENTS_LOG, entry);
}

export function logFeedbackEvent(entry: FeedbackLogEntry): Promise<void> {
  return appendJsonLine(FEEDBACK_LOG, entry);
}
```

- [ ] **Step 3: Implement stats aggregation**

Create `backend/src/lib/admin-stats.ts` with:

```ts
import type { FeedbackLogEntry, ScanLogEntry } from "./activity-log.js";
import type { VisionStatus } from "./vision.js";

type SpeciesLookup = { id: string; navnNo: string };

export type AdminStats = {
  totals: { scans: number; feedback: number };
  scanStatus: Record<VisionStatus, number>;
  feedbackVotes: { like: number; dislike: number };
  mostDisliked: { navnNo: string; kategori: string; count: number }[];
  recentScans: ScanLogEntry[];
  recentFeedback: (FeedbackLogEntry & { correctedSpeciesName: string | null })[];
};

export function buildAdminStats(
  scans: ScanLogEntry[],
  feedback: FeedbackLogEntry[],
  species: SpeciesLookup[],
): AdminStats {
  const correctedNames = new Map(species.map((item) => [item.id, item.navnNo]));
  const mostDisliked = new Map<string, { navnNo: string; kategori: string; count: number }>();

  for (const entry of feedback) {
    if (entry.vote !== "dislike") continue;
    const key = `${entry.treff.kategori}:${entry.treff.navnNo}`;
    const existing = mostDisliked.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      mostDisliked.set(key, { navnNo: entry.treff.navnNo, kategori: entry.treff.kategori, count: 1 });
    }
  }

  return {
    totals: { scans: scans.length, feedback: feedback.length },
    scanStatus: {
      treff: scans.filter((entry) => entry.status === "treff").length,
      usikker: scans.filter((entry) => entry.status === "usikker").length,
      ikke_skadedyr: scans.filter((entry) => entry.status === "ikke_skadedyr").length,
    },
    feedbackVotes: {
      like: feedback.filter((entry) => entry.vote === "like").length,
      dislike: feedback.filter((entry) => entry.vote === "dislike").length,
    },
    mostDisliked: [...mostDisliked.values()].sort((a, b) => b.count - a.count).slice(0, 8),
    recentScans: [...scans].sort((a, b) => b.tidspunkt.localeCompare(a.tidspunkt)).slice(0, 20),
    recentFeedback: [...feedback]
      .sort((a, b) => b.tidspunkt.localeCompare(a.tidspunkt))
      .slice(0, 20)
      .map((entry) => ({
        ...entry,
        correctedSpeciesName: entry.korrigertArtId ? correctedNames.get(entry.korrigertArtId) ?? null : null,
      })),
  };
}
```

- [ ] **Step 4: Verify backend tests**

Run `cd backend && npm test -- --test-name-pattern "aggregates scan"` and verify the aggregation test passes.

- [ ] **Step 5: Commit backend log/stat foundation**

Commit `backend/src/lib/activity-log.ts`, `backend/src/lib/admin-stats.ts`, and `backend/src/lib/admin-stats.test.ts` with message `Add admin activity aggregation`.

## Task 2: Backend Admin Routes And Logging Integration

**Files:**
- Create: `backend/src/routes/admin.ts`
- Modify: `backend/src/routes/scan.ts`
- Modify: `backend/src/routes/feedback.ts`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Add admin auth and stats route**

Create `backend/src/routes/admin.ts`:

```ts
import crypto from "crypto";
import { Router } from "express";
import species from "../data/species.json" with { type: "json" };
import {
  FEEDBACK_LOG,
  SCAN_EVENTS_LOG,
  isFeedbackLogEntry,
  isScanLogEntry,
  readJsonLines,
} from "../lib/activity-log.js";
import { buildAdminStats } from "../lib/admin-stats.js";

export const adminRouter = Router();

function getAdminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  return password && password.length >= 8 ? password : null;
}

function createAdminToken(password: string): string {
  return crypto.createHash("sha256").update(`pestulus-admin-v1:${password}`).digest("hex");
}

function getBearerToken(header: unknown): string | null {
  if (typeof header !== "string" || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

function isAuthorized(authorization: unknown): boolean {
  const password = getAdminPassword();
  const token = getBearerToken(authorization);
  return !!password && !!token && token === createAdminToken(password);
}

adminRouter.post("/login", (req, res) => {
  const password = getAdminPassword();
  if (!password) {
    return res.status(503).json({ error: "Admin er ikke konfigurert." });
  }
  const body: unknown = req.body;
  const submitted = body && typeof body === "object" ? (body as { password?: unknown }).password : null;
  if (submitted !== password) {
    return res.status(401).json({ error: "Feil passord." });
  }
  res.json({ token: createAdminToken(password) });
});

adminRouter.get("/stats", async (req, res) => {
  if (!isAuthorized(req.headers.authorization)) {
    return res.status(401).json({ error: "Ikke innlogget." });
  }

  const [scans, feedback] = await Promise.all([
    readJsonLines(SCAN_EVENTS_LOG, isScanLogEntry),
    readJsonLines(FEEDBACK_LOG, isFeedbackLogEntry),
  ]);

  res.json(buildAdminStats(scans, feedback, species));
});
```

- [ ] **Step 2: Mount admin route**

In `backend/src/server.ts`, import `adminRouter` and mount it before the catch-all species router:

```ts
import { adminRouter } from "./routes/admin.js";
app.use("/admin", adminRouter);
```

- [ ] **Step 3: Log scan events**

In `backend/src/routes/scan.ts`, import `logScanEvent`. After `const result = await identifyPest(...)`, append:

```ts
logScanEvent({
  tidspunkt: new Date().toISOString(),
  status: result.status,
  imageCount: imageBase64List.length,
  topTreff: result.treff[0]
    ? {
        navnNo: result.treff[0].navnNo,
        navnLatin: result.treff[0].navnLatin,
        kategori: result.treff[0].kategori,
        konfidens: result.treff[0].konfidens,
      }
    : null,
}).catch((err) => console.error("scan-logg-feil:", err));
```

- [ ] **Step 4: Use shared feedback logging**

In `backend/src/routes/feedback.ts`, remove direct `fs`, `path`, and `fileURLToPath` imports and replace `fs.appendFile(...)` with:

```ts
await logFeedbackEvent(entry);
```

Import `logFeedbackEvent` from `../lib/activity-log.js`.

- [ ] **Step 5: Verify backend**

Run:

```bash
cd backend
npm test
npm run build
```

Expected: all tests pass and TypeScript build succeeds.

- [ ] **Step 6: Commit backend admin API**

Commit backend route/logging changes with message `Add admin activity API`.

## Task 3: Client Admin API And Hidden Screen

**Files:**
- Modify: `app/lib/api.ts`
- Modify: `app/components/ui/icon-symbol.tsx`
- Create: `app/app/admin.tsx`

- [ ] **Step 1: Add admin API client**

In `app/lib/api.ts`, add exported types for `AdminStats`, `AdminScanEntry`, and `AdminFeedbackEntry`, plus:

```ts
export function adminLogin(password: string): Promise<{ token: string }> {
  return request<{ token: string }>('/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}

export function fetchAdminStats(token: string): Promise<AdminStats> {
  return request<AdminStats>('/admin/stats', {
    headers: { Authorization: `Bearer ${token}` },
  });
}
```

- [ ] **Step 2: Add icon mappings**

In `app/components/ui/icon-symbol.tsx`, add mappings for:

```ts
'lock.fill': 'lock',
'chart.bar.fill': 'bar-chart',
'person.crop.circle.fill': 'admin-panel-settings',
```

- [ ] **Step 3: Create hidden admin screen**

Create `app/app/admin.tsx` with:

- password `TextInput` login form
- `adminLogin()` on submit
- dashboard fetch after successful login
- metric cards
- most disliked section
- recent scans section
- recent feedback section
- no visible links from tab navigation

Use user-facing Norwegian strings such as `Admin`, `Passord`, `Logg inn`, `Søk`, `Riktig art`, `Feil art`, `Siste søk`, and `Siste stemmer`.

- [ ] **Step 4: Verify app**

Run:

```bash
cd app
npm run lint
npx tsc --noEmit
```

Expected: lint and TypeScript pass.

- [ ] **Step 5: Commit client admin dashboard**

Commit app changes with message `Add hidden admin dashboard`.

## Task 4: End-To-End Verification And PR Update

**Files:**
- Read: `backend/package.json`
- Read: `app/package.json`

- [ ] **Step 1: Run full verification**

Run:

```bash
cd backend
npm test
npm run build
cd ../app
npm run lint
npx tsc --noEmit
```

Expected: all commands exit 0.

- [ ] **Step 2: Smoke test admin locally**

Start backend with a local password:

```bash
cd backend
$env:ADMIN_PASSWORD="lokalt-testpassord"
npm run dev
```

Open `/admin` in the web app and verify:

- login screen renders
- wrong password shows error
- correct password loads stats
- dashboard renders empty states if logs are empty

- [ ] **Step 3: Push branch**

Run:

```bash
git status --short
git push
```

Expected: working tree clean and existing PR updates.
