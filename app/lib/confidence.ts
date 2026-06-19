const GREEN = '#5A9E6F';
const YELLOW = '#C9A24B';
const RED    = '#C1654F';

export function confidenceColor(value: number): string {
  if (value >= 0.7) return GREEN;
  if (value >= 0.5) return YELLOW;
  return RED;
}

export function confidenceLabel(
  value: number,
  labels: { high: string; good: string; moderate: string; low: string }
): string {
  if (value >= 0.85) return labels.high;
  if (value >= 0.7)  return labels.good;
  if (value >= 0.5)  return labels.moderate;
  return labels.low;
}
