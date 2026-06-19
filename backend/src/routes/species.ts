import { Router } from "express";
import species from "../data/species.json" with { type: "json" };
import { withImage } from "../lib/images.js";
import {
  getSupportedLanguage,
  localizeCategories,
  localizeSpeciesList,
  localizeSpeciesRecord,
  type CanonicalSpecies,
} from "../lib/localization.js";

export const speciesRouter = Router();
const allSpecies = species as CanonicalSpecies[];

// GET /species  -> alle arter
speciesRouter.get("/species", (req, res) => {
  const language = getSupportedLanguage(req.query.lang, req.headers["accept-language"]);
  res.json(localizeSpeciesList(allSpecies.map(withImage), language));
});

// GET /species/:id -> én art
speciesRouter.get("/species/:id", (req, res) => {
  const language = getSupportedLanguage(req.query.lang, req.headers["accept-language"]);
  const art = allSpecies.find((s) => s.id === req.params.id);
  if (!art) return res.status(404).json({ error: "Fant ikke arten" });
  res.json(localizeSpeciesRecord(withImage(art), language));
});

// GET /categories -> unike kategorier med antall
speciesRouter.get("/categories", (req, res) => {
  const language = getSupportedLanguage(req.query.lang, req.headers["accept-language"]);
  res.json(localizeCategories(allSpecies, language));
});
