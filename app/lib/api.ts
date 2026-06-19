/**
 * Klient for Pestulus-backenden. Overstyr med EXPO_PUBLIC_API_URL for å peke mot
 * en backend på nettverket (f.eks. ved testing på fysisk enhet via Expo Go).
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';
export type ApiLanguage = 'no' | 'sv' | 'da';

export type VisionStatus = 'treff' | 'usikker' | 'ikke_skadedyr';
export type ScanImageSource = 'camera' | 'library' | 'unknown';

export type Species = {
  id: string;
  navnNo: string;
  navnOriginalNo?: string;
  navnLatin: string;
  kategori: string;
  kategoriId?: string;
  kjennetegn: string;
  forveksling?: string;
  beskrivelse: string;
  helsemessigBetydning: string;
  tiltak: string;
  bildeUrl: string;
  region: string;
  language?: ApiLanguage;
  nameStatus?: 'canonical' | 'verified' | 'english_fallback';
  nameSource?: string;
  textStatus?: 'canonical' | 'verified' | 'machine_draft' | 'untranslated';
};

export type Category = {
  id: string;
  navn: string;
  antall: number;
};

export type Treff = {
  id?: string;
  navnNo: string;
  navnOriginalNo?: string;
  navnLatin: string;
  kategori: string;
  kategoriId?: string;
  konfidens: number;
  species: Species | null;
  language?: ApiLanguage;
  nameStatus?: 'canonical' | 'verified' | 'english_fallback';
  nameSource?: string;
};

export type ScanResult = {
  scanId?: string;
  status: VisionStatus;
  treff: Treff[];
};

export type ScanRequestMetadata = {
  clientId?: string;
  imageSources?: ScanImageSource[];
  language?: ApiLanguage;
};

export type AdminScanTreff = {
  navnNo: string;
  navnLatin: string;
  kategori: string;
  konfidens: number;
};

export type AdminScanImage = {
  fileName: string;
  urlPath: string;
  imageUrl?: string;
  source: ScanImageSource;
};

export type AdminScanEntry = {
  scanId?: string;
  clientId?: string | null;
  tidspunkt: string;
  status: VisionStatus;
  imageCount: number;
  imageSource?: ScanImageSource | 'mixed';
  images?: AdminScanImage[];
  treff?: AdminScanTreff[];
  topTreff: AdminScanTreff | null;
};

export type AdminFeedbackEntry = {
  scanId?: string | null;
  tidspunkt: string;
  vote: FeedbackVote;
  treff: { navnNo: string; navnLatin: string; kategori: string };
  korrigertArtId: string | null;
  correctedSpeciesName: string | null;
};

export type AdminStats = {
  totals: { scans: number; feedback: number };
  scanStatus: Record<VisionStatus, number>;
  feedbackVotes: { like: number; dislike: number };
  mostDisliked: { navnNo: string; kategori: string; count: number }[];
  recentScans: AdminScanEntry[];
  recentFeedback: AdminFeedbackEntry[];
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

function withLanguage(path: string, language?: ApiLanguage): string {
  if (!language) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}lang=${encodeURIComponent(language)}`;
}

export function scanImages(
  imageBase64List: string[],
  metadata: ScanRequestMetadata = {},
): Promise<ScanResult> {
  const { language, ...requestMetadata } = metadata;
  return request<ScanResult>(withLanguage('/scan', language), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64List, ...requestMetadata }),
  });
}

export function scanImage(imageBase64: string): Promise<ScanResult> {
  return scanImages([imageBase64]);
}

export function fetchCategories(language?: ApiLanguage): Promise<Category[]> {
  return request<Category[]>(withLanguage('/categories', language));
}

export function fetchSpecies(language?: ApiLanguage): Promise<Species[]> {
  return request<Species[]>(withLanguage('/species', language));
}

export function fetchSpeciesById(id: string, language?: ApiLanguage): Promise<Species> {
  return request<Species>(withLanguage(`/species/${encodeURIComponent(id)}`, language));
}

/** Gjør en relativ bilde-sti fra backend (f.eks. "/images/Veggedyr.jpg") om til full URL. */
export function resolveImageUrl(bildeUrl: string): string {
  if (!bildeUrl) return '';
  return bildeUrl.startsWith('http') ? bildeUrl : `${API_URL}${bildeUrl}`;
}

export type FeedbackVote = 'like' | 'dislike';

export type FeedbackPayload = {
  scanId?: string;
  vote: FeedbackVote;
  treff: { id?: string; navnNo: string; navnLatin: string; kategori: string; kategoriId?: string };
  korrigertArtId?: string;
};

export function sendFeedback(payload: FeedbackPayload): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function adminLogin(password: string): Promise<{ token: string }> {
  return request<{ token: string }>('/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}

export function fetchAdminStats(token: string): Promise<AdminStats> {
  return request<AdminStats>('/admin/stats', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function resetAdminData(token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/admin/reset', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}
