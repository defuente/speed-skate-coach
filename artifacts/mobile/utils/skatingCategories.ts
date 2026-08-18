import type { AgeCategory, PerformanceLevel } from '@/types/training';

export const PERFORMANCE_LEVELS: PerformanceLevel[] = [
  'Formativo / Escuela',
  'Intermedia',
  'Alta Competencia / Federado',
];

export interface AgeCategoryDefinition {
  label: AgeCategory;
  minAge: number;
  maxAge?: number;
}

export const AGE_CATEGORIES: AgeCategoryDefinition[] = [
  { label: '6ª Categoría', minAge: 0, maxAge: 6 },
  { label: '5ª Categoría', minAge: 7, maxAge: 8 },
  { label: '4ª Categoría', minAge: 9, maxAge: 10 },
  { label: '3ª Categoría', minAge: 11, maxAge: 12 },
  { label: 'Pre-Juvenil', minAge: 13, maxAge: 14 },
  { label: 'Juvenil', minAge: 15, maxAge: 18 },
  { label: 'Adulto', minAge: 19, maxAge: 29 },
  { label: 'Senior', minAge: 30, maxAge: 40 },
  { label: 'Máster', minAge: 41 },
];

function parseBirthYear(birthDate?: string): number | undefined {
  if (!birthDate) return undefined;
  const match = birthDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return year;
}

export function getCompetitionAgeForYear(
  birthDate: string | undefined,
  year: number,
): number | undefined {
  const birthYear = parseBirthYear(birthDate);
  if (birthYear === undefined || !Number.isInteger(year)) return undefined;

  // La categoría se determina por la edad cumplida al 31 de diciembre.
  // Por eso, dentro de un año calendario basta con comparar el año de nacimiento.
  const age = year - birthYear;
  return age >= 0 ? age : undefined;
}

export function getAgeCategoryForYear(
  birthDate: string | undefined,
  year: number,
): AgeCategory | undefined {
  const age = getCompetitionAgeForYear(birthDate, year);
  if (age === undefined) return undefined;

  return AGE_CATEGORIES.find(
    item => age >= item.minAge && (item.maxAge === undefined || age <= item.maxAge),
  )?.label;
}

export function getAgeCategoryForDate(
  birthDate: string | undefined,
  date: string | Date,
): AgeCategory | undefined {
  const year =
    typeof date === 'string'
      ? Number(date.match(/^(\d{4})/)?.[1])
      : date.getFullYear();

  if (!Number.isInteger(year)) return undefined;
  return getAgeCategoryForYear(birthDate, year);
}

export function getCurrentAgeCategory(
  birthDate: string | undefined,
  now = new Date(),
): AgeCategory | undefined {
  return getAgeCategoryForYear(birthDate, now.getFullYear());
}

export function isPerformanceLevel(value?: string): value is PerformanceLevel {
  return PERFORMANCE_LEVELS.includes(value as PerformanceLevel);
}
