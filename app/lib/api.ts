/**
 * Klient for Pestulus-backenden. Overstyr med EXPO_PUBLIC_API_URL for å peke mot
 * en backend på nettverket (f.eks. ved testing på fysisk enhet via Expo Go).
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';

export type VisionStatus = 'treff' | 'usikker' | 'ikke_skadedyr';

export type Species = {
  id: string;
  navnNo: string;
  navnLatin: string;
  kategori: string;
  kjennetegn: string;
  forveksling?: string;
  beskrivelse: string;
  helsemessigBetydning: string;
  tiltak: string;
  bildeUrl: string;
  region: string;
};

export type Category = {
  navn: string;
  antall: number;
};

export type Treff = {
  navnNo: string;
  navnLatin: string;
  kategori: string;
  konfidens: number;
  species: Species | null;
};

export type ScanResult = {
  status: VisionStatus;
  treff: Treff[];
};

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError('Klarte ikke å kontakte serveren. Sjekk nettforbindelsen.');
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(body?.error ?? `Forespørselen feilet (${response.status}).`);
  }

  return response.json() as Promise<T>;
}

export function scanImages(imageBase64List: string[]): Promise<ScanResult> {
  return request<ScanResult>('/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64List }),
  });
}

export function scanImage(imageBase64: string): Promise<ScanResult> {
  return scanImages([imageBase64]);
}

export function fetchCategories(): Promise<Category[]> {
  return request<Category[]>('/categories');
}

export function fetchSpecies(): Promise<Species[]> {
  return request<Species[]>('/species');
}

export function fetchSpeciesById(id: string): Promise<Species> {
  return request<Species>(`/species/${encodeURIComponent(id)}`);
}

/** Gjør en relativ bilde-sti fra backend (f.eks. "/images/Veggedyr.jpg") om til full URL. */
export function resolveImageUrl(bildeUrl: string): string {
  if (!bildeUrl) return '';
  return bildeUrl.startsWith('http') ? bildeUrl : `${API_URL}${bildeUrl}`;
}

export type FeedbackVote = 'like' | 'dislike';

export type FeedbackPayload = {
  vote: FeedbackVote;
  treff: { navnNo: string; navnLatin: string; kategori: string };
  korrigertArtId?: string;
};

export function sendFeedback(payload: FeedbackPayload): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
