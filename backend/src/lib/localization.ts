import defaultLocalizations from "../data/species-localizations.json" with { type: "json" };

export type SupportedLanguage = "no" | "sv" | "da";
export type NameStatus = "canonical" | "verified" | "english_fallback";
export type TextStatus = "canonical" | "verified" | "machine_draft" | "untranslated";

export type CanonicalSpecies = {
  id: string;
  navnNo: string;
  navnLatin: string;
  kategori: string;
  kjennetegn: string;
  beskrivelse: string;
  helsemessigBetydning: string;
  tiltak: string;
  bildeUrl: string;
  region: string;
  forveksling?: string;
};

export type SpeciesLocalization = {
  name: string;
  nameStatus: Exclude<NameStatus, "canonical">;
  nameSource: string;
  category: string;
  region: string;
  kjennetegn?: string;
  beskrivelse?: string;
  helsemessigBetydning?: string;
  tiltak?: string;
  forveksling?: string;
  textStatus?: Exclude<TextStatus, "canonical">;
};

export type SpeciesLocalizationMap = Record<
  string,
  Partial<Record<Exclude<SupportedLanguage, "no">, SpeciesLocalization>>
>;

export type LocalizedSpecies = CanonicalSpecies & {
  navnOriginalNo: string;
  kategoriId: string;
  language: SupportedLanguage;
  nameStatus: NameStatus;
  nameSource: string;
  textStatus: TextStatus;
};

export type LocalizedCategory = {
  id: string;
  navn: string;
  antall: number;
};

const LANGUAGE_ALIASES: Record<string, SupportedLanguage> = {
  no: "no",
  nb: "no",
  nn: "no",
  sv: "sv",
  se: "sv",
  da: "da",
  dk: "da",
};

const CATEGORY_TRANSLATIONS: Record<Exclude<SupportedLanguage, "no">, Record<string, string>> = {
  sv: {
    "Smådyr": "Småkryp",
    "Maur": "Myror",
    "Fluer og mygg": "Flugor och myggor",
    "Veggedyr og andre teger": "Vägglöss och andra skinnbaggar",
    "Kakerlakker": "Kackerlackor",
    "Biller": "Skalbaggar",
    "Sommerfugler og møll": "Fjärilar och malar",
    "Lus": "Löss",
    "Edderkopper, midd og flått": "Spindlar, kvalster och fästingar",
    "Veps, bier & humler": "Getingar, bin och humlor",
    "Gnagere": "Gnagare",
    "Fugler": "Fåglar",
    "Pattedyr": "Däggdjur",
    "Krypdyr / Reptiler": "Kräldjur / reptiler",
  },
  da: {
    "Smådyr": "Smådyr",
    "Maur": "Myrer",
    "Fluer og mygg": "Fluer og myg",
    "Veggedyr og andre teger": "Væggelus og andre tæger",
    "Kakerlakker": "Kakerlakker",
    "Biller": "Biller",
    "Sommerfugler og møll": "Sommerfugle og møl",
    "Lus": "Lus",
    "Edderkopper, midd og flått": "Edderkopper, mider og flåter",
    "Veps, bier & humler": "Hvepse, bier og humlebier",
    "Gnagere": "Gnavere",
    "Fugler": "Fugle",
    "Pattedyr": "Pattedyr",
    "Krypdyr / Reptiler": "Krybdyr / reptiler",
  },
};

const DEFAULT_LOCALIZATIONS = defaultLocalizations as SpeciesLocalizationMap;

function normalizeLanguagePart(value: string): SupportedLanguage | null {
  const language = value.trim().split(";")[0]?.split("-")[0]?.toLowerCase();
  if (!language) return null;
  return LANGUAGE_ALIASES[language] ?? null;
}

export function getSupportedLanguage(
  explicitLanguage: unknown,
  acceptLanguage: unknown,
): SupportedLanguage {
  if (typeof explicitLanguage === "string") {
    const language = normalizeLanguagePart(explicitLanguage);
    if (language) return language;
  }

  if (typeof acceptLanguage === "string") {
    for (const part of acceptLanguage.split(",")) {
      const language = normalizeLanguagePart(part);
      if (language) return language;
    }
  }

  return "no";
}

export function localizeCategoryName(category: string, language: SupportedLanguage): string {
  if (language === "no") return category;
  return CATEGORY_TRANSLATIONS[language][category] ?? category;
}

export function localizeSpeciesRecord(
  species: CanonicalSpecies,
  language: SupportedLanguage,
  localizations: SpeciesLocalizationMap = DEFAULT_LOCALIZATIONS,
): LocalizedSpecies {
  if (language === "no") {
    return {
      ...species,
      navnOriginalNo: species.navnNo,
      kategoriId: species.kategori,
      language,
      nameStatus: "canonical",
      nameSource: "FHI",
      textStatus: "canonical",
    };
  }

  const localized = localizations[species.id]?.[language];
  if (!localized) {
    return {
      ...species,
      navnOriginalNo: species.navnNo,
      kategori: localizeCategoryName(species.kategori, language),
      kategoriId: species.kategori,
      language,
      nameStatus: "english_fallback",
      nameSource: "missing-localization",
      textStatus: "untranslated",
    };
  }

  return {
    ...species,
    navnNo: localized.name,
    navnOriginalNo: species.navnNo,
    kategori: localized.category,
    kategoriId: species.kategori,
    kjennetegn: localized.kjennetegn ?? species.kjennetegn,
    beskrivelse: localized.beskrivelse ?? species.beskrivelse,
    helsemessigBetydning: localized.helsemessigBetydning ?? species.helsemessigBetydning,
    tiltak: localized.tiltak ?? species.tiltak,
    region: localized.region,
    forveksling: localized.forveksling ?? species.forveksling,
    language,
    nameStatus: localized.nameStatus,
    nameSource: localized.nameSource,
    textStatus: localized.textStatus ?? "untranslated",
  };
}

export function localizeSpeciesList(
  species: CanonicalSpecies[],
  language: SupportedLanguage,
): LocalizedSpecies[] {
  return species.map((item) => localizeSpeciesRecord(item, language));
}

export function localizeCategories(
  species: CanonicalSpecies[],
  language: SupportedLanguage,
  localizations: SpeciesLocalizationMap = DEFAULT_LOCALIZATIONS,
): LocalizedCategory[] {
  const counts = new Map<string, number>();
  for (const item of species) {
    counts.set(item.kategori, (counts.get(item.kategori) ?? 0) + 1);
  }

  return [...counts.entries()].map(([id, antall]) => ({
    id,
    navn: localizeCategoryName(id, language),
    antall,
  }));
}

export function localizeTreff<T extends { id: string; navnNo: string; navnLatin: string; kategori: string }>(
  treff: T,
  species: CanonicalSpecies[],
  language: SupportedLanguage,
): T & Pick<LocalizedSpecies, "navnOriginalNo" | "kategoriId" | "language" | "nameStatus" | "nameSource"> {
  const canonical = species.find((item) => item.id === treff.id);
  if (!canonical) {
    return {
      ...treff,
      navnOriginalNo: treff.navnNo,
      kategoriId: treff.kategori,
      language,
      nameStatus: language === "no" ? "canonical" : "english_fallback",
      nameSource: "missing-species",
    };
  }

  const localized = localizeSpeciesRecord(canonical, language);
  return {
    ...treff,
    navnNo: localized.navnNo,
    kategori: localized.kategori,
    navnOriginalNo: localized.navnOriginalNo,
    kategoriId: localized.kategoriId,
    language,
    nameStatus: localized.nameStatus,
    nameSource: localized.nameSource,
  };
}
