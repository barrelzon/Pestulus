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
