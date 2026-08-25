import type { Task } from './task';

export interface CalendarConfig {
  /** true = días corridos (cuenta todos los días). false = días hábiles (excluye sáb/dom + feriados). */
  workOnWeekends: boolean;
  /** ISO dates (yyyy-MM-dd), sólo aplican cuando workOnWeekends es false. */
  holidays: string[];
}

export interface ProjectMeta {
  title: string;
  client?: string;
  location?: string;
  logoDataUrl?: string;
}

export interface RubroPaletteEntry {
  key: string;
  label: string;
  color: string;
}

export const SCHEMA_VERSION = 1;

export interface ProjectFile {
  schemaVersion: number;
  meta: ProjectMeta;
  calendar: CalendarConfig;
  palette: RubroPaletteEntry[];
  tasks: Task[];
}
