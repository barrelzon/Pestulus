import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Treff, VisionStatus } from "./vision.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../data");

export const SCAN_EVENTS_LOG = path.join(DATA_DIR, "scan-events.log");
export const FEEDBACK_LOG = path.join(DATA_DIR, "feedback.log");
export const ADMIN_SCAN_IMAGES_DIR = path.join(DATA_DIR, "admin-scan-images");

export type ScanImageSource = "camera" | "library" | "unknown";
export type ScanImageSourceSummary = ScanImageSource | "mixed";

export type ScanLogTreff = Pick<Treff, "navnNo" | "navnLatin" | "kategori" | "konfidens">;

export type ScanImageLogEntry = {
  fileName: string;
  urlPath: string;
  source: ScanImageSource;
};

export type ScanLogEntry = {
  scanId?: string;
  clientId?: string | null;
  tidspunkt: string;
  status: VisionStatus;
  imageCount: number;
  imageSource?: ScanImageSourceSummary;
  imageSources?: ScanImageSource[];
  images?: ScanImageLogEntry[];
  treff?: ScanLogTreff[];
  topTreff: ScanLogTreff | null;
};

export type FeedbackLogEntry = {
  scanId?: string | null;
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
  return isScanLogTreff(value);
}

function isScanLogTreff(value: unknown): value is ScanLogTreff {
  if (!isRecord(value)) return false;
  return (
    typeof value.navnNo === "string" &&
    typeof value.navnLatin === "string" &&
    typeof value.kategori === "string" &&
    typeof value.konfidens === "number"
  );
}

function isScanImageSource(value: unknown): value is ScanImageSource {
  return value === "camera" || value === "library" || value === "unknown";
}

function isScanImageSourceSummary(value: unknown): value is ScanImageSourceSummary {
  return isScanImageSource(value) || value === "mixed";
}

function isScanImageLogEntry(value: unknown): value is ScanImageLogEntry {
  if (!isRecord(value)) return false;
  return (
    typeof value.fileName === "string" &&
    typeof value.urlPath === "string" &&
    isScanImageSource(value.source)
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
    (value.scanId === undefined || typeof value.scanId === "string") &&
    (value.clientId === undefined || value.clientId === null || typeof value.clientId === "string") &&
    typeof value.tidspunkt === "string" &&
    (value.status === "treff" || value.status === "usikker" || value.status === "ikke_skadedyr") &&
    typeof value.imageCount === "number" &&
    (value.imageSource === undefined || isScanImageSourceSummary(value.imageSource)) &&
    (value.imageSources === undefined ||
      (Array.isArray(value.imageSources) && value.imageSources.every(isScanImageSource))) &&
    (value.images === undefined ||
      (Array.isArray(value.images) && value.images.every(isScanImageLogEntry))) &&
    (value.treff === undefined ||
      (Array.isArray(value.treff) && value.treff.every(isScanLogTreff))) &&
    isTopTreff(value.topTreff)
  );
}

export function isFeedbackLogEntry(value: unknown): value is FeedbackLogEntry {
  if (!isRecord(value)) return false;
  return (
    (value.scanId === undefined || value.scanId === null || typeof value.scanId === "string") &&
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

export function summarizeImageSources(sources: ScanImageSource[]): ScanImageSourceSummary {
  const unique = [...new Set(sources)];
  if (unique.length === 1) return unique[0] ?? "unknown";
  return "mixed";
}

export async function saveScanImages(
  scanId: string,
  imageBase64List: string[],
  imageSources: ScanImageSource[],
): Promise<ScanImageLogEntry[]> {
  await fs.mkdir(ADMIN_SCAN_IMAGES_DIR, { recursive: true });

  return Promise.all(
    imageBase64List.map(async (imageBase64, index) => {
      const fileName = `${scanId}-${index + 1}.jpg`;
      const filePath = path.join(ADMIN_SCAN_IMAGES_DIR, fileName);
      await fs.writeFile(filePath, Buffer.from(imageBase64, "base64"));
      return {
        fileName,
        urlPath: `/admin/images/${fileName}`,
        source: imageSources[index] ?? "unknown",
      };
    }),
  );
}

export function getScanImagePath(fileName: string): string | null {
  const safeFileName = path.basename(fileName);
  if (safeFileName !== fileName || !safeFileName.endsWith(".jpg")) return null;
  return path.join(ADMIN_SCAN_IMAGES_DIR, safeFileName);
}

export async function resetActivityLogs(): Promise<void> {
  await Promise.all([
    fs.rm(SCAN_EVENTS_LOG, { force: true }),
    fs.rm(FEEDBACK_LOG, { force: true }),
    fs.rm(ADMIN_SCAN_IMAGES_DIR, { force: true, recursive: true }),
  ]);
}
