import assert from "node:assert/strict";
import test from "node:test";

import { buildGenerationConfig, buildSpeciesPrompt, type Candidate } from "./vision.js";

test("species prompt does not default all-black ants to rare black stokkmaur", () => {
  const candidates: Candidate[] = [
    {
      id: "stokkmaur",
      navnNo: "Stokkmaur",
      navnLatin: "Camponotus spp.",
      kategori: "Maur",
      kjennetegn: "5-18 mm. Sjelden sotstokkmaur er ensfarget sort.",
      forveksling: "Svart jordmaur og sauemaur er mindre og helt svarte.",
    },
    {
      id: "svart-jordmaur",
      navnNo: "Svart jordmaur",
      navnLatin: "Lasius niger",
      kategori: "Maur",
      kjennetegn: "3-5 mm. Matt svart.",
    },
    {
      id: "sauemaur",
      navnNo: "Sauemaur",
      navnLatin: "Formica fusca",
      kategori: "Maur",
      kjennetegn: "4,5-7 mm. Glanssvart.",
    },
  ];

  const prompt = buildSpeciesPrompt(candidates);

  assert.match(prompt, /helsvart maur/i);
  assert.match(prompt, /behandle Stokkmaur som rødbrun\/sort med helt svart hode/i);
  assert.match(prompt, /helsvart maur skal ikke identifiseres som Stokkmaur/i);
  assert.match(prompt, /se bort fra sjelden sotstokkmaur/i);
  assert.match(prompt, /Svart jordmaur/i);
  assert.match(prompt, /Sauemaur/i);
  assert.match(prompt, /Svart tremaur/i);
});

test("vision model calls use deterministic JSON generation", () => {
  const config = buildGenerationConfig({ type: "OBJECT" });

  assert.equal(config.temperature, 0);
  assert.equal(config.responseMimeType, "application/json");
});
