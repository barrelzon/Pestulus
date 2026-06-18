type SearchableSpecies = {
  navnNo: string;
  navnLatin: string;
};

type RankedSpecies<T> = {
  species: T;
  group: number;
  originalIndex: number;
};

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function getSearchRank<T extends SearchableSpecies>(
  species: T,
  query: string,
  originalIndex: number
): RankedSpecies<T> | null {
  const navnNo = normalizeSearchText(species.navnNo);
  const navnLatin = normalizeSearchText(species.navnLatin);

  if (navnNo.includes(query)) {
    return {
      species,
      group: 0,
      originalIndex,
    };
  }

  if (!navnLatin.includes(query)) return null;

  return {
    species,
    group: 1,
    originalIndex,
  };
}

export function filterAndRankSpecies<T extends SearchableSpecies>(species: T[], query: string): T[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  return species
    .map((item, index) => getSearchRank(item, normalizedQuery, index))
    .filter((item): item is RankedSpecies<T> => item !== null)
    .sort((a, b) => {
      if (a.group !== b.group) return a.group - b.group;
      return a.originalIndex - b.originalIndex;
    })
    .map((item) => item.species);
}
