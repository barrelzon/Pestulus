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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function isNotFoundError(err: unknown): boolean {
  return isRecord(err) && err.code === "ENOENT";
}

function isTopTreff(value: unknown): value is ScanLogEntry["topTreff"] {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  return (
    typeof value.navnNo === "string" &&
    typeof value.navnLatin === "string" &&
    typeof value.kategori === "string" &&
    typeof value.konfidens === "number"
  );
}

function isFeedbackTreff(value: unknown): value is FeedbackLogEntry["treff"] {
  if (!isRecord(value)) return false;
  return (
    typeof value.navnNo === "string" &&
    typeof value.navnLatin === "string" &&
    typeof value.kategori === "string"
  );
}

export async function appendJsonLine(filePath: string, entry: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf8");
}

export async function readJsonLines<T>(
  filePath: string,
  isEntry: (value: unknown) => value is T,
): Promise<T[]> {
  const raw = await fs.readFile(filePath, "utf8").catch((err: unknown) => {
    if (isNotFoundError(err)) return "";
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
  if (!isRecord(value)) return false;
  return (
    typeof value.tidspunkt === "string" &&
    (value.status === "treff" || value.status === "usikker" || value.status === "ikke_skadedyr") &&
    typeof value.imageCount === "number" &&
    isTopTreff(value.topTreff)
  );
}

export function isFeedbackLogEntry(value: unknown): value is FeedbackLogEntry {
  if (!isRecord(value)) return false;
  return (
    typeof value.tidspunkt === "string" &&
    (value.vote === "like" || value.vote === "dislike") &&
    isFeedbackTreff(value.treff) &&
    (value.korrigertArtId === null || typeof value.korrigertArtId === "string")
  );
}

export function logScanEvent(entry: ScanLogEntry): Promise<void> {
  return appendJsonLine(SCAN_EVENTS_LOG, entry);
}

export function logFeedbackEvent(entry: FeedbackLogEntry): Promise<void> {
  return appendJsonLine(FEEDBACK_LOG, entry);
}
