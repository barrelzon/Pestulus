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
      mostDisliked.set(key, {
        navnNo: entry.treff.navnNo,
        kategori: entry.treff.kategori,
        count: 1,
      });
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
        correctedSpeciesName: entry.korrigertArtId
          ? correctedNames.get(entry.korrigertArtId) ?? null
          : null,
      })),
  };
}
