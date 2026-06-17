/**
 * Klient for Pestulus-backenden. Overstyr med EXPO_PUBLIC_API_URL for å peke mot
 * en backend på nettverket (f.eks. ved testing på fysisk enhet via Expo Go).
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';

export type VisionStatus = 'treff' | 'usikker' | 'ikke_skadedyr';
export type ScanImageSource = 'camera' | 'library' | 'unknown';

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
  scanId?: string;
  status: VisionStatus;
  treff: Treff[];
};

export type ScanRequestMetadata = {
  clientId?: string;
  imageSources?: ScanImageSource[];
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

export function scanImages(
  imageBase64List: string[],
  metadata: ScanRequestMetadata = {},
): Promise<ScanResult> {
  return request<ScanResult>('/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64List, ...metadata }),
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
  scanId?: string;
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
