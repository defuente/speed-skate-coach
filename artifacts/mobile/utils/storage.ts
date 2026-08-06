import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, AppSettings, TrainingType } from '@/types/training';

const SESSIONS_KEY = '@patincrono/sessions';
const STORAGE_KEY = '@patincrono/storage';

interface StorageData {
  appSettings: AppSettings;
  colorMode: 'light' | 'dark' | 'auto';
}

const DEFAULT_STORAGE: StorageData = {
  appSettings: {
    athleteName: '',
    defaultTrainingType: 'Resistencia',
    defaultDistancePerLap: 400,
  },
  colorMode: 'auto',
};

export async function getSessions(): Promise<Session[]> {
  try {
    const json = await AsyncStorage.getItem(SESSIONS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveSession(session: Session): Promise<void> {
  const sessions = await getSessions();
  sessions.unshift(session);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export async function deleteSession(id: string): Promise<void> {
  const sessions = await getSessions();
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.filter(s => s.id !== id)));
}

export async function getSession(id: string): Promise<Session | null> {
  const sessions = await getSessions();
  return sessions.find(s => s.id === id) ?? null;
}

export async function getStorageData(): Promise<StorageData> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? { ...DEFAULT_STORAGE, ...JSON.parse(json) } : DEFAULT_STORAGE;
  } catch {
    return DEFAULT_STORAGE;
  }
}

export async function saveStorageData(data: StorageData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
