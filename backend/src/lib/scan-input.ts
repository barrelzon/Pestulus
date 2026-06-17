const MAX_SCAN_IMAGES = 3;
const MIN_BASE64_LENGTH = 100;

function isValidImageBase64(value: unknown): value is string {
  return typeof value === "string" && value.length >= MIN_BASE64_LENGTH;
}

export function parseScanImages(body: unknown): string[] {
  const payload = body as { imageBase64?: unknown; imageBase64List?: unknown };

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
    return payload.imageBase64List;
  }

  if (isValidImageBase64(payload.imageBase64)) {
    return [payload.imageBase64];
  }

  throw new Error("Mangler gyldig bilde");
}
