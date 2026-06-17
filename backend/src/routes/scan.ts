import crypto from "crypto";
import { Router } from "express";
import species from "../data/species.json" with { type: "json" };
import {
  logScanEvent,
  saveScanImages,
  summarizeImageSources,
  type ScanImageSource,
} from "../lib/activity-log.js";
import { parseScanInput } from "../lib/scan-input.js";
import { identifyPest } from "../lib/vision.js";
import { withImage } from "../lib/images.js";

export const scanRouter = Router();

/**
 * POST /scan
 * Body: { imageBase64: string } eller { imageBase64List: string[] }
 * Bilder sendes uten "data:..."-prefiks.
 * Svar: { status, treff: [{ navnNo, navnLatin, kategori, konfidens, species? }] }
 */
scanRouter.post("/", async (req, res) => {
  let imageBase64List: string[];
  let clientId: string | null;
  let imageSources: ScanImageSource[];
  try {
    const input = parseScanInput(req.body);
    imageBase64List = input.imageBase64List;
    clientId = input.clientId;
    imageSources = input.imageSources;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Mangler gyldig bilde";
    return res.status(400).json({ error: message });
  }

  try {
    const candidates = species.map((s) => ({
      navnNo: s.navnNo,
      navnLatin: s.navnLatin,
      kategori: s.kategori,
      kjennetegn: (s as { kjennetegn?: string }).kjennetegn,
      forveksling: (s as { forveksling?: string }).forveksling,
    }));

    const scanId = crypto.randomUUID();
    const result = await identifyPest(imageBase64List, candidates);
    const scanImages = await saveScanImages(scanId, imageBase64List, imageSources).catch((err) => {
      console.error("scan-bilde-logg-feil:", err);
      return [];
    });

    logScanEvent({
      scanId,
      clientId,
      tidspunkt: new Date().toISOString(),
      status: result.status,
      imageCount: imageBase64List.length,
      imageSource: summarizeImageSources(imageSources),
      imageSources,
      images: scanImages,
      treff: result.treff.slice(0, 5).map((t) => ({
        navnNo: t.navnNo,
        navnLatin: t.navnLatin,
        kategori: t.kategori,
        konfidens: t.konfidens,
      })),
      topTreff: result.treff[0]
        ? {
            navnNo: result.treff[0].navnNo,
            navnLatin: result.treff[0].navnLatin,
            kategori: result.treff[0].kategori,
            konfidens: result.treff[0].konfidens,
          }
        : null,
    }).catch((err) => console.error("scan-logg-feil:", err));

    // Berik hvert treff med full artsinfo fra databasen.
    const treff = result.treff.map((t) => {
      const full = species.find(
        (s) => s.navnNo === t.navnNo || s.navnLatin === t.navnLatin,
      );
      return { ...t, species: full ? withImage(full) : null };
    });

    res.json({ scanId, status: result.status, treff });
  } catch (err) {
    console.error("scan-feil:", err);
    res.status(502).json({ error: "Gjenkjenning feilet. Prøv igjen." });
  }
});
