import { Router } from "express";
import species from "../data/species.json" with { type: "json" };
import { identifyPest } from "../lib/vision.js";
import { withImage } from "../lib/images.js";

export const scanRouter = Router();

/**
 * POST /scan
 * Body: { imageBase64: string }  // bilde uten "data:..."-prefiks
 * Svar: { status, treff: [{ navnNo, navnLatin, kategori, konfidens, species? }] }
 */
scanRouter.post("/", async (req, res) => {
  const imageBase64: unknown = req.body?.imageBase64;
  if (typeof imageBase64 !== "string" || imageBase64.length < 100) {
    return res.status(400).json({ error: "Mangler gyldig imageBase64" });
  }

  try {
    const candidates = species.map((s) => ({
      navnNo: s.navnNo,
      navnLatin: s.navnLatin,
      kategori: s.kategori,
      kjennetegn: (s as { kjennetegn?: string }).kjennetegn,
      forveksling: (s as { forveksling?: string }).forveksling,
    }));

    const result = await identifyPest(imageBase64, candidates);

    // Berik hvert treff med full artsinfo fra databasen.
    const treff = result.treff.map((t) => {
      const full = species.find(
        (s) => s.navnNo === t.navnNo || s.navnLatin === t.navnLatin,
      );
      return { ...t, species: full ? withImage(full) : null };
    });

    res.json({ status: result.status, treff });
  } catch (err) {
    console.error("scan-feil:", err);
    res.status(502).json({ error: "Gjenkjenning feilet. Prøv igjen." });
  }
});
