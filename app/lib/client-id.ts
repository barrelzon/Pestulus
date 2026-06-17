import AsyncStorage from '@react-native-async-storage/async-storage';

const CLIENT_ID_KEY = '@pestulus/client-id';

function makeClientId() {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `client-${random}`;
}

export async function getClientId(): Promise<string> {
  const existing = await AsyncStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;

  const next = makeClientId();
  await AsyncStorage.setItem(CLIENT_ID_KEY, next);
  return next;
}
