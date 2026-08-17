import AsyncStorage from '@react-native-async-storage/async-storage';
import { Athlete, AppSettings, Session } from '@/types/training';

const SESSIONS_KEY = '@patincrono/sessions';
const STORAGE_KEY = '@patincrono/storage';
const LEGACY_ATHLETES_KEY = '@patincrono/athletes';
const ATHLETES_V2_KEY = '@patincrono/athletes_v2';
const SCHEMA_VERSION_KEY = '@patincrono/schema_version';
const ATHLETE_SCHEMA_VERSION = '2';

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

export function normalizeAthleteName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function createAthlete(name: string): Athlete {
  const now = new Date().toISOString();
  return {
    id: createId('ath'),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

function sortAthletes(athletes: Athlete[]): Athlete[] {
  return [...athletes].sort((a, b) =>
    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
  );
}

function uniqueLegacyNames(names: string[]): string[] {
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

async function readSessionsRaw(): Promise<Session[]> {
  try {
    const json = await AsyncStorage.getItem(SESSIONS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

async function readLegacyAthleteNames(): Promise<string[]> {
  try {
    const json = await AsyncStorage.getItem(LEGACY_ATHLETES_KEY);
    const value = json ? JSON.parse(json) : [];
    return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

async function readAthleteProfilesRaw(): Promise<Athlete[]> {
  try {
    const json = await AsyncStorage.getItem(ATHLETES_V2_KEY);
    const value = json ? JSON.parse(json) : [];
    if (!Array.isArray(value)) return [];
    return value.filter(
      item => item && typeof item.id === 'string' && typeof item.name === 'string',
    );
  } catch {
    return [];
  }
}

async function persistAthletes(athletes: Athlete[]): Promise<void> {
  const sorted = sortAthletes(athletes);
  await Promise.all([
    AsyncStorage.setItem(ATHLETES_V2_KEY, JSON.stringify(sorted)),
    AsyncStorage.setItem(LEGACY_ATHLETES_KEY, JSON.stringify(sorted.map(athlete => athlete.name))),
    AsyncStorage.setItem(SCHEMA_VERSION_KEY, ATHLETE_SCHEMA_VERSION),
  ]);
}

async function ensureAthleteMigration(): Promise<{ athletes: Athlete[]; sessions: Session[] }> {
  const [storedProfiles, legacyNames, rawSessions, schemaVersion] = await Promise.all([
    readAthleteProfilesRaw(),
    readLegacyAthleteNames(),
    readSessionsRaw(),
    AsyncStorage.getItem(SCHEMA_VERSION_KEY),
  ]);

  const athletes: Athlete[] = [];
  const athleteByName = new Map<string, Athlete>();
  let athletesChanged = false;

  for (const profile of storedProfiles) {
    const cleanName = profile.name.trim();
    if (!cleanName) {
      athletesChanged = true;
      continue;
    }

    const key = normalizeAthleteName(cleanName);
    if (athleteByName.has(key)) {
      athletesChanged = true;
      continue;
    }

    const normalizedProfile: Athlete = {
      ...profile,
      name: cleanName,
      createdAt: profile.createdAt || new Date().toISOString(),
      updatedAt: profile.updatedAt || profile.createdAt || new Date().toISOString(),
    };
    athletes.push(normalizedProfile);
    athleteByName.set(key, normalizedProfile);
  }

  const namesToMigrate = uniqueLegacyNames([
    ...legacyNames,
    ...rawSessions.map(session => session.athleteName || ''),
  ]);

  for (const name of namesToMigrate) {
    const key = normalizeAthleteName(name);
    if (athleteByName.has(key)) continue;
    const athlete = createAthlete(name);
    athletes.push(athlete);
    athleteByName.set(key, athlete);
    athletesChanged = true;
  }

  const athleteById = new Map(athletes.map(athlete => [athlete.id, athlete]));
  let sessionsChanged = false;
  const migratedSessions = rawSessions.map(session => {
    let athlete = session.athleteId ? athleteById.get(session.athleteId) : undefined;
    if (!athlete && session.athleteName.trim()) {
      athlete = athleteByName.get(normalizeAthleteName(session.athleteName));
    }

    if (!athlete) return session;
    if (session.athleteId === athlete.id && session.athleteName === athlete.name) return session;

    sessionsChanged = true;
    return {
      ...session,
      athleteId: athlete.id,
      athleteName: athlete.name,
    };
  });

  if (athletesChanged || schemaVersion !== ATHLETE_SCHEMA_VERSION || !storedProfiles.length) {
    await persistAthletes(athletes);
  }
  if (sessionsChanged) {
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(migratedSessions));
  }

  return { athletes: sortAthletes(athletes), sessions: migratedSessions };
}

export async function getSessions(): Promise<Session[]> {
  try {
    const { sessions } = await ensureAthleteMigration();
    return sessions;
  } catch {
    return readSessionsRaw();
  }
}

export async function getAthleteProfiles(): Promise<Athlete[]> {
  try {
    const { athletes } = await ensureAthleteMigration();
    return athletes;
  } catch {
    return [];
  }
}

export async function getAthlete(id: string): Promise<Athlete | null> {
  const athletes = await getAthleteProfiles();
  return athletes.find(athlete => athlete.id === id) ?? null;
}

export async function getAthletes(): Promise<string[]> {
  const athletes = await getAthleteProfiles();
  return athletes.map(athlete => athlete.name);
}

export async function upsertAthlete(
  name: string,
  fields: Partial<Pick<Athlete, 'birthDate' | 'category' | 'club' | 'notes'>> = {},
): Promise<Athlete> {
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Nombre inválido');

  const athletes = await getAthleteProfiles();
  const key = normalizeAthleteName(cleanName);
  const existingIndex = athletes.findIndex(athlete => normalizeAthleteName(athlete.name) === key);
  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    const existing = athletes[existingIndex];
    const updated: Athlete = {
      ...existing,
      ...fields,
      name: cleanName,
      updatedAt: now,
    };
    const next = [...athletes];
    next[existingIndex] = updated;
    await persistAthletes(next);
    return updated;
  }

  const athlete: Athlete = {
    ...createAthlete(cleanName),
    ...fields,
    name: cleanName,
    updatedAt: now,
  };
  await persistAthletes([...athletes, athlete]);
  return athlete;
}

export async function updateAthlete(
  id: string,
  changes: Partial<Pick<Athlete, 'name' | 'birthDate' | 'category' | 'club' | 'notes'>>,
): Promise<Athlete> {
  const athletes = await getAthleteProfiles();
  const index = athletes.findIndex(athlete => athlete.id === id);
  if (index < 0) throw new Error('Deportista no encontrado');

  const current = athletes[index];
  const cleanName = (changes.name ?? current.name).trim();
  if (!cleanName) throw new Error('Nombre inválido');

  const duplicate = athletes.find(
    athlete => athlete.id !== id && normalizeAthleteName(athlete.name) === normalizeAthleteName(cleanName),
  );
  if (duplicate) throw new Error('Ya existe un deportista con ese nombre');

  const updated: Athlete = {
    ...current,
    ...changes,
    name: cleanName,
    updatedAt: new Date().toISOString(),
  };
  const next = [...athletes];
  next[index] = updated;

  const sessions = await getSessions();
  const updatedSessions = sessions.map(session =>
    session.athleteId === id
      ? { ...session, athleteName: cleanName }
      : session,
  );

  await Promise.all([
    persistAthletes(next),
    AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updatedSessions)),
  ]);
  return updated;
}

export async function saveAthlete(name: string): Promise<string[]> {
  const cleanName = name.trim();
  if (!cleanName) return getAthletes();
  await upsertAthlete(cleanName);
  return getAthletes();
}

export async function saveSession(session: Session): Promise<void> {
  let normalizedSession = session;

  if (session.athleteName.trim()) {
    const athletes = await getAthleteProfiles();
    let athlete = session.athleteId
      ? athletes.find(item => item.id === session.athleteId)
      : undefined;

    if (!athlete) {
      athlete = athletes.find(
        item => normalizeAthleteName(item.name) === normalizeAthleteName(session.athleteName),
      );
    }
    if (!athlete) athlete = await upsertAthlete(session.athleteName);

    normalizedSession = {
      ...session,
      athleteId: athlete.id,
      athleteName: athlete.name,
    };
  }

  const sessions = await getSessions();
  sessions.unshift(normalizedSession);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export async function deleteSession(id: string): Promise<void> {
  const sessions = await getSessions();
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.filter(session => session.id !== id)));
}

export async function getSession(id: string): Promise<Session | null> {
  const sessions = await getSessions();
  return sessions.find(session => session.id === id) ?? null;
}

export async function getAthleteSessions(idOrName: string): Promise<Session[]> {
  const key = normalizeAthleteName(idOrName);
  const sessions = await getSessions();
  return sessions.filter(
    session => session.athleteId === idOrName || normalizeAthleteName(session.athleteName) === key,
  );
}

export async function renameAthlete(idOrName: string, newName: string): Promise<void> {
  const cleanNew = newName.trim();
  if (!cleanNew) throw new Error('Nombre inválido');

  const athletes = await getAthleteProfiles();
  const key = normalizeAthleteName(idOrName);
  const athlete = athletes.find(
    item => item.id === idOrName || normalizeAthleteName(item.name) === key,
  );
  if (!athlete) throw new Error('Deportista no encontrado');

  await updateAthlete(athlete.id, { name: cleanNew });
}

export async function deleteAthlete(idOrName: string): Promise<void> {
  const athletes = await getAthleteProfiles();
  const key = normalizeAthleteName(idOrName);
  const athlete = athletes.find(
    item => item.id === idOrName || normalizeAthleteName(item.name) === key,
  );
  if (!athlete) return;

  const sessions = await getSessions();
  await Promise.all([
    persistAthletes(athletes.filter(item => item.id !== athlete.id)),
    AsyncStorage.setItem(
      SESSIONS_KEY,
      JSON.stringify(
        sessions.filter(
          session =>
            session.athleteId !== athlete.id &&
            normalizeAthleteName(session.athleteName) !== normalizeAthleteName(athlete.name),
        ),
      ),
    ),
  ]);
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
