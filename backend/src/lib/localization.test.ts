import assert from "node:assert/strict";
import test from "node:test";
import {
  getSupportedLanguage,
  localizeCategories,
  localizeSpeciesRecord,
  type SpeciesLocalizationMap,
  type SupportedLanguage,
} from "./localization.js";
import species from "../data/species.json" with { type: "json" };
import speciesLocalizations from "../data/species-localizations.json" with { type: "json" };

const baseSpecies = {
  id: "veggedyr",
  navnNo: "Veggedyr",
  navnLatin: "Cimex lectularius",
  kategori: "Veggedyr og andre teger",
  kjennetegn: "Oval, flattrykt, rødbrun, 5–6 mm.",
  beskrivelse: "Rødbrun, flattrykt og vingeløs tege.",
  helsemessigBetydning: "Bitt gir kløe.",
  tiltak: "Inspiser sengetøy ved reise.",
  bildeUrl: "",
  region: "Norge",
  forveksling: "Svaletege.",
};

const localizations: SpeciesLocalizationMap = {
  veggedyr: {
    sv: {
      name: "vägglus",
      nameStatus: "verified",
      nameSource: "GBIF",
      category: "Vägglöss och andra skinnbaggar",
      region: "Norge",
      kjennetegn: "Oval, tillplattad, rödbrun, 5–6 mm.",
      beskrivelse: "Rödbrun, tillplattad och vinglös skinnbagge.",
      helsemessigBetydning: "Bett ger klåda.",
      tiltak: "Inspektera sängkläder vid resa.",
      forveksling: "Svalvägglus.",
      textStatus: "verified",
    },
    da: {
      name: "bed bug",
      nameStatus: "english_fallback",
      nameSource: "GBIF",
      category: "Væggelus og andre tæger",
      region: "Norge",
      kjennetegn: "Oval, fladtrykt, rødbrun, 5–6 mm.",
      beskrivelse: "Rødbrun, fladtrykt og vingeløs tæge.",
      helsemessigBetydning: "Bid giver kløe.",
      tiltak: "Undersøg sengetøj på rejser.",
      forveksling: "Svaletæge.",
      textStatus: "machine_draft",
    },
  },
};

test("selects supported language from explicit language or Accept-Language", () => {
  assert.equal(getSupportedLanguage("sv", undefined), "sv");
  assert.equal(getSupportedLanguage(undefined, "da-DK,sv;q=0.8,no;q=0.6"), "da");
  assert.equal(getSupportedLanguage("fr", "sv-SE,da;q=0.8"), "sv");
  assert.equal(getSupportedLanguage(undefined, undefined), "no");
});

test("localizes a species while preserving canonical ids and Norwegian name", () => {
  const localized = localizeSpeciesRecord(baseSpecies, "sv", localizations);

  assert.equal(localized.id, "veggedyr");
  assert.equal(localized.navnNo, "vägglus");
  assert.equal(localized.navnOriginalNo, "Veggedyr");
  assert.equal(localized.kategori, "Vägglöss och andra skinnbaggar");
  assert.equal(localized.kategoriId, "Veggedyr og andre teger");
  assert.equal(localized.nameStatus, "verified");
  assert.equal(localized.language, "sv");
  assert.equal(localized.kjennetegn, "Oval, tillplattad, rödbrun, 5–6 mm.");
});

test("uses English fallback names when localized common name is not verified", () => {
  const localized = localizeSpeciesRecord(baseSpecies, "da", localizations);

  assert.equal(localized.navnNo, "bed bug");
  assert.equal(localized.nameStatus, "english_fallback");
  assert.equal(localized.kategori, "Væggelus og andre tæger");
});

test("localizes categories and keeps canonical category ids", () => {
  const species = [
    baseSpecies,
    { ...baseSpecies, id: "svaletege", navnNo: "Svaletege" },
    { ...baseSpecies, id: "fugleloppe", navnNo: "Fugleloppe", kategori: "Smådyr" },
  ];

  const categories = localizeCategories(species, "sv" satisfies SupportedLanguage, localizations);

  assert.deepEqual(categories, [
    { id: "Veggedyr og andre teger", navn: "Vägglöss och andra skinnbaggar", antall: 2 },
    { id: "Smådyr", navn: "Småkryp", antall: 1 },
  ]);
});

test("localization data covers every species in Swedish and Danish", () => {
  const localizations = speciesLocalizations as SpeciesLocalizationMap;

  for (const item of species) {
    assert.ok(localizations[item.id]?.sv, `${item.id} is missing Swedish localization`);
    assert.ok(localizations[item.id]?.da, `${item.id} is missing Danish localization`);
    assert.match(localizations[item.id]?.sv?.nameStatus ?? "", /^(verified|english_fallback)$/);
    assert.match(localizations[item.id]?.da?.nameStatus ?? "", /^(verified|english_fallback)$/);
  }
});
