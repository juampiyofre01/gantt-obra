import type { ProjectFile } from '../types/project';
import { SCHEMA_VERSION } from '../types/project';

const STORAGE_KEY = 'gantt-obra:project';

export function saveToLocalStorage(project: ProjectFile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch {
    // localStorage puede fallar en modo privado o por cuota excedida; el autosave simplemente se omite.
  }
}

export function loadFromLocalStorage(): ProjectFile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProjectFile;
    if (parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.tasks)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function exportProjectJSON(project: ProjectFile): string {
  return JSON.stringify(project, null, 2);
}

export function parseProjectJSON(raw: string): ProjectFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('El archivo no es JSON válido.');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as ProjectFile).tasks)
  ) {
    throw new Error('El archivo no tiene el formato esperado de un cronograma.');
  }
  return { ...(parsed as ProjectFile), schemaVersion: SCHEMA_VERSION };
}
