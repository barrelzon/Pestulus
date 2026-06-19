import { Router } from "express";
import species from "../data/species.json" with { type: "json" };
import { logFeedbackEvent } from "../lib/activity-log.js";

export const feedbackRouter = Router();

type FeedbackTreff = { id?: string; navnNo: string; navnLatin: string; kategori: string; kategoriId?: string };

function isFeedbackTreff(value: unknown): value is FeedbackTreff {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.navnNo === "string" &&
    typeof t.navnLatin === "string" &&
    typeof t.kategori === "string" &&
    (t.id === undefined || typeof t.id === "string") &&
    (t.kategoriId === undefined || typeof t.kategoriId === "string")
  );
}

function canonicalizeFeedbackTreff(treff: FeedbackTreff): { navnNo: string; navnLatin: string; kategori: string } {
  const match = species.find(
    (item) => item.id === treff.id || item.navnLatin === treff.navnLatin || item.navnNo === treff.navnNo,
  );
  if (!match) {
    return {
      navnNo: treff.navnNo,
      navnLatin: treff.navnLatin,
      kategori: treff.kategoriId ?? treff.kategori,
    };
  }
  return {
    navnNo: match.navnNo,
    navnLatin: match.navnLatin,
    kategori: match.kategori,
  };
}

/**
 * POST /feedback
 * Body: { scanId?: string, vote: "like" | "dislike", treff: {navnNo, navnLatin, kategori}, korrigertArtId?: string }
 * Lagrer brukerens tilbakemelding på gjenkjenningen, slik at den kan brukes til å
 * forbedre vision-kandidatlista/prompten senere.
 */
feedbackRouter.post("/", async (req, res) => {
  const body: unknown = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Ugyldig forespørsel" });
  }

  const { scanId, vote, treff, korrigertArtId } = body as Record<string, unknown>;

  if (vote !== "like" && vote !== "dislike") {
    return res.status(400).json({ error: "Mangler gyldig vote ('like' eller 'dislike')" });
  }
  const voteValue: "like" | "dislike" = vote;
  if (!isFeedbackTreff(treff)) {
    return res.status(400).json({ error: "Mangler gyldig treff" });
  }
  if (korrigertArtId !== undefined) {
    if (typeof korrigertArtId !== "string" || !species.some((s) => s.id === korrigertArtId)) {
      return res.status(400).json({ error: "Ugyldig korrigertArtId" });
    }
  }
  const correctedSpeciesId = typeof korrigertArtId === "string" ? korrigertArtId : null;
  const linkedScanId = typeof scanId === "string" && scanId.length > 0 ? scanId : null;

  const entry = {
    scanId: linkedScanId,
    tidspunkt: new Date().toISOString(),
    vote: voteValue,
    treff: canonicalizeFeedbackTreff(treff),
    korrigertArtId: correctedSpeciesId,
  };

  try {
    await logFeedbackEvent(entry);
  } catch (err) {
    console.error("feedback-feil:", err);
  }

  res.json({ ok: true });
});
