import { useEffect, useState } from 'react';
import { fetchSpecies, type ApiLanguage, type Species } from '@/lib/api';

const cache = new Map<ApiLanguage, Species[]>();

export function useAllSpecies(language: ApiLanguage = 'no'): Species[] {
  const [species, setSpecies] = useState<Species[]>(cache.get(language) ?? []);
  useEffect(() => {
    const cached = cache.get(language);
    if (cached) {
      setSpecies(cached);
      return;
    }
    fetchSpecies(language)
      .then((data) => {
        cache.set(language, data);
        setSpecies(data);
      })
      .catch(() => {});
  }, [language]);
  return species;
}
