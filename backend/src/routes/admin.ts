import crypto from "crypto";
import { Router } from "express";
import species from "../data/species.json" with { type: "json" };
import {
  getScanImagePath,
  FEEDBACK_LOG,
  SCAN_EVENTS_LOG,
  isFeedbackLogEntry,
  isScanLogEntry,
  readJsonLines,
  resetActivityLogs,
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

function isAuthorizedToken(token: unknown): boolean {
  const password = getAdminPassword();
  return typeof token === "string" && !!password && token === createAdminToken(password);
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
  const token = getBearerToken(req.headers.authorization);
  if (!token || !isAuthorizedToken(token)) {
    return res.status(401).json({ error: "Ikke innlogget." });
  }

  const [scans, feedback] = await Promise.all([
    readJsonLines(SCAN_EVENTS_LOG, isScanLogEntry),
    readJsonLines(FEEDBACK_LOG, isFeedbackLogEntry),
  ]);

  const stats = buildAdminStats(scans, feedback, species);
  res.json({
    ...stats,
    recentScans: stats.recentScans.map((scan) => ({
      ...scan,
      images: scan.images?.map((image) => ({
        ...image,
        imageUrl: `${image.urlPath}?token=${encodeURIComponent(token)}`,
      })),
    })),
  });
});

adminRouter.get("/images/:fileName", (req, res) => {
  if (!isAuthorizedToken(req.query.token)) {
    return res.status(401).json({ error: "Ikke innlogget." });
  }

  const imagePath = getScanImagePath(req.params.fileName);
  if (!imagePath) {
    return res.status(404).json({ error: "Fant ikke bildet." });
  }

  res.sendFile(imagePath, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: "Fant ikke bildet." });
    }
  });
});

adminRouter.post("/reset", async (req, res) => {
  if (!isAuthorized(req.headers.authorization)) {
    return res.status(401).json({ error: "Ikke innlogget." });
  }

  await resetActivityLogs();
  res.json({ ok: true });
});
