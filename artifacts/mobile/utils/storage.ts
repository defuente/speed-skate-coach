import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, AppSettings } from '@/types/training';

const SESSIONS_KEY = '@patincrono/sessions';
const STORAGE_KEY = '@patincrono/storage';
const ATHLETES_KEY = '@patincrono/athletes';

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

function normalizeAthleteName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

function uniqueAthleteNames(names: string[]): string[] {
  const seen = new Set<string>();
  return names
    .map(name => name.trim())
    .filter(Boolean)
    .filter(name => {
      const key = normalizeAthleteName(name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

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
  if (session.athleteName.trim()) await saveAthlete(session.athleteName);
}

export async function deleteSession(id: string): Promise<void> {
  const sessions = await getSessions();
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.filter(s => s.id !== id)));
}

export async function getSession(id: string): Promise<Session | null> {
  const sessions = await getSessions();
  return sessions.find(s => s.id === id) ?? null;
}

export async function getAthletes(): Promise<string[]> {
  try {
    const [storedJson, sessions] = await Promise.all([
      AsyncStorage.getItem(ATHLETES_KEY),
      getSessions(),
    ]);
    const stored: string[] = storedJson ? JSON.parse(storedJson) : [];
    const fromHistory = sessions.map(session => session.athleteName);
    const athletes = uniqueAthleteNames([...stored, ...fromHistory]);
    await AsyncStorage.setItem(ATHLETES_KEY, JSON.stringify(athletes));
    return athletes;
  } catch {
    return [];
  }
}

export async function saveAthlete(name: string): Promise<string[]> {
  const cleanName = name.trim();
  if (!cleanName) return getAthletes();

  const athletes = await getAthletes();
  const existing = athletes.find(
    athlete => normalizeAthleteName(athlete) === normalizeAthleteName(cleanName),
  );
  if (existing) return athletes;

  const updated = [...athletes, cleanName].sort((a, b) =>
    a.localeCompare(b, 'es', { sensitivity: 'base' }),
  );
  await AsyncStorage.setItem(ATHLETES_KEY, JSON.stringify(updated));
  return updated;
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
