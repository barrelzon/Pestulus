const MAX_SCAN_IMAGES = 3;
const MIN_BASE64_LENGTH = 100;
const MAX_CLIENT_ID_LENGTH = 120;

export type ParsedScanImageSource = "camera" | "library" | "unknown";

export type ParsedScanInput = {
  imageBase64List: string[];
  clientId: string | null;
  imageSources: ParsedScanImageSource[];
};

function isValidImageBase64(value: unknown): value is string {
  return typeof value === "string" && value.length >= MIN_BASE64_LENGTH;
}

function parseClientId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < 8 || trimmed.length > MAX_CLIENT_ID_LENGTH) return null;
  return trimmed;
}

function parseImageSource(value: unknown): ParsedScanImageSource {
  return value === "camera" || value === "library" ? value : "unknown";
}

function parseImageSources(value: unknown, imageCount: number): ParsedScanImageSource[] {
  if (!Array.isArray(value)) return Array.from({ length: imageCount }, () => "unknown");
  return Array.from({ length: imageCount }, (_, index) => parseImageSource(value[index]));
}

export function parseScanInput(body: unknown): ParsedScanInput {
  const payload = body as { imageBase64?: unknown; imageBase64List?: unknown };
  let imageBase64List: string[];

  if (Array.isArray(payload.imageBase64List)) {
    if (payload.imageBase64List.length < 1) {
      throw new Error("Mangler gyldig bilde");
    }
    if (payload.imageBase64List.length > MAX_SCAN_IMAGES) {
      throw new Error("Maks 3 bilder per scan");
    }
    if (!payload.imageBase64List.every(isValidImageBase64)) {
      throw new Error("Mangler gyldig bilde");
    }
    imageBase64List = payload.imageBase64List;
  } else if (isValidImageBase64(payload.imageBase64)) {
    imageBase64List = [payload.imageBase64];
  } else {
    throw new Error("Mangler gyldig bilde");
  }

  return {
    imageBase64List,
    clientId: parseClientId((payload as { clientId?: unknown }).clientId),
    imageSources: parseImageSources((payload as { imageSources?: unknown }).imageSources, imageBase64List.length),
  };
}

export function parseScanImages(body: unknown): string[] {
  return parseScanInput(body).imageBase64List;
}
