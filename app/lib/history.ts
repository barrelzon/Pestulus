/**
 * Lokal History (AsyncStorage). v1 lagrer kun vellykkede søk (status "treff").
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Treff } from './api';

const STORAGE_KEY = '@pestulus/history';

export type ScanRecord = {
  id: string;
  tidspunkt: string; // ISO-dato
  brukerBilde: string; // data:image/jpeg;base64,...
  treff: Treff;
  alternativeTreff: Treff[];
};

async function readAll(): Promise<ScanRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScanRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(records: ScanRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export async function getHistory(): Promise<ScanRecord[]> {
  const records = await readAll();
  return records.sort((a, b) => b.tidspunkt.localeCompare(a.tidspunkt));
}

export async function getHistoryRecord(id: string): Promise<ScanRecord | null> {
  const records = await readAll();
  return records.find((record) => record.id === id) ?? null;
}

export async function addHistoryRecord(
  entry: Omit<ScanRecord, 'id' | 'tidspunkt'>
): Promise<ScanRecord> {
  const record: ScanRecord = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tidspunkt: new Date().toISOString(),
  };
  const records = await readAll();
  records.push(record);
  await writeAll(records);
  return record;
}

export async function deleteHistoryRecord(id: string): Promise<void> {
  const records = await readAll();
  await writeAll(records.filter((record) => record.id !== id));
}
