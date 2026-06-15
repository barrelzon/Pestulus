import { Router } from "express";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import species from "../data/species.json" with { type: "json" };

export const feedbackRouter = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FEEDBACK_LOG = path.join(__dirname, "../data/feedback.log");

type FeedbackTreff = { navnNo: string; navnLatin: string; kategori: string };

function isFeedbackTreff(value: unknown): value is FeedbackTreff {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.navnNo === "string" &&
    typeof t.navnLatin === "string" &&
    typeof t.kategori === "string"
  );
}

/**
 * POST /feedback
 * Body: { vote: "like" | "dislike", treff: {navnNo, navnLatin, kategori}, korrigertArtId?: string }
 * Lagrer brukerens tilbakemelding på gjenkjenningen, slik at den kan brukes til å
 * forbedre vision-kandidatlista/prompten senere.
 */
feedbackRouter.post("/", async (req, res) => {
  const body: unknown = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Ugyldig forespørsel" });
  }

  const { vote, treff, korrigertArtId } = body as Record<string, unknown>;

  if (vote !== "like" && vote !== "dislike") {
    return res.status(400).json({ error: "Mangler gyldig vote ('like' eller 'dislike')" });
  }
  if (!isFeedbackTreff(treff)) {
    return res.status(400).json({ error: "Mangler gyldig treff" });
  }
  if (korrigertArtId !== undefined) {
    if (typeof korrigertArtId !== "string" || !species.some((s) => s.id === korrigertArtId)) {
      return res.status(400).json({ error: "Ugyldig korrigertArtId" });
    }
  }

  const entry = {
    tidspunkt: new Date().toISOString(),
    vote,
    treff,
    korrigertArtId: korrigertArtId ?? null,
  };

  try {
    await fs.appendFile(FEEDBACK_LOG, JSON.stringify(entry) + "\n", "utf8");
  } catch (err) {
    console.error("feedback-feil:", err);
  }

  res.json({ ok: true });
});
