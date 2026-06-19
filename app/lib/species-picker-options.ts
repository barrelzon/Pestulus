import type { ApiLanguage, Species } from './api';

function localeForLanguage(language: ApiLanguage): string {
  return language === 'no' ? 'nb' : language;
}

export function getSpeciesPickerOptions(
  allSpecies: Species[],
  category: string,
  excludedSpeciesId: string | null,
  language: ApiLanguage,
): Species[] {
  return allSpecies
    .filter((species) => {
      const speciesCategoryId = species.kategoriId ?? species.kategori;
      const matchesCategory = speciesCategoryId === category || species.kategori === category;
      return matchesCategory && species.id !== excludedSpeciesId;
    })
    .sort((a, b) => a.navnNo.localeCompare(b.navnNo, localeForLanguage(language)));
}
