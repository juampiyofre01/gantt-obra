import type { Task } from '../types/task';
import type { CalendarConfig } from '../types/project';
import { spanDays } from './dateMath';
import { isSummaryTask } from './hierarchy';

export interface VolumeTotal {
  unit: string;
  quantity: number;
}

export interface ProjectSummary {
  startDate: string | null;
  endDate: string | null;
  totalCalendarDays: number;
  totalWorkDays: number;
  volumesByUnit: VolumeTotal[];
}

const CORRIDOS: CalendarConfig = { workOnWeekends: true, holidays: [] };

/** Totals shown in the project header and repeated on every printed page. */
export function computeProjectSummary(tasks: Task[], calendar: CalendarConfig): ProjectSummary {
  if (tasks.length === 0) {
    return { startDate: null, endDate: null, totalCalendarDays: 0, totalWorkDays: 0, volumesByUnit: [] };
  }

  const roots = tasks.filter((t) => t.parentUid === null);
  const startDate = roots.map((t) => t.startDate).reduce((a, b) => (a <= b ? a : b));
  const endDate = roots.map((t) => t.endDate).reduce((a, b) => (a >= b ? a : b));

  const volumeMap = new Map<string, number>();
  for (const t of tasks) {
    if (isSummaryTask(tasks, t.uid)) continue; // no duplicar cantidades de capítulos
    if (!t.unit || t.quantity === undefined) continue;
    volumeMap.set(t.unit, (volumeMap.get(t.unit) ?? 0) + t.quantity);
  }

  return {
    startDate,
    endDate,
    totalCalendarDays: spanDays(startDate, endDate, CORRIDOS),
    totalWorkDays: spanDays(startDate, endDate, calendar),
    volumesByUnit: Array.from(volumeMap.entries()).map(([unit, quantity]) => ({ unit, quantity })),
  };
}
