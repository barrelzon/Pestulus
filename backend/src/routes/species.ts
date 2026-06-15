import { Router } from "express";
import species from "../data/species.json" with { type: "json" };
import { withImage } from "../lib/images.js";

export const speciesRouter = Router();

// GET /species  -> alle arter
speciesRouter.get("/species", (_req, res) => {
  res.json(species.map(withImage));
});

// GET /species/:id -> én art
speciesRouter.get("/species/:id", (req, res) => {
  const art = species.find((s) => s.id === req.params.id);
  if (!art) return res.status(404).json({ error: "Fant ikke arten" });
  res.json(withImage(art));
});

// GET /categories -> unike kategorier med antall
speciesRouter.get("/categories", (_req, res) => {
  const map = new Map<string, number>();
  for (const s of species) map.set(s.kategori, (map.get(s.kategori) ?? 0) + 1);
  const categories = [...map.entries()].map(([navn, antall]) => ({ navn, antall }));
  res.json(categories);
});
