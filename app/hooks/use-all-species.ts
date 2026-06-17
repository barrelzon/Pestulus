import { useEffect, useState } from 'react';
import { fetchSpecies, type Species } from '@/lib/api';

let cache: Species[] | null = null;

export function useAllSpecies(): Species[] {
  const [species, setSpecies] = useState<Species[]>(cache ?? []);
  useEffect(() => {
    if (cache) return;
    fetchSpecies()
      .then((data) => {
        cache = data;
        setSpecies(data);
      })
      .catch(() => {});
  }, []);
  return species;
}
