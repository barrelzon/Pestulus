const GREEN = '#5A9E6F';
const YELLOW = '#C9A24B';
const RED    = '#C1654F';

export function confidenceColor(value: number): string {
  if (value >= 0.7) return GREEN;
  if (value >= 0.5) return YELLOW;
  return RED;
}

export function confidenceLabel(value: number): string {
  if (value >= 0.85) return 'Høy sikkerhet';
  if (value >= 0.7)  return 'God sikkerhet';
  if (value >= 0.5)  return 'Moderat sikkerhet';
  return 'Lav sikkerhet';
}
