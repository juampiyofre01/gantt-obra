import { addDays } from 'date-fns';
import { formatISODate, parseISODate } from '../../engine/dateMath';
import type { Task } from '../../types/task';

export type ZoomLevel = 'day' | 'week' | 'month';

export const PX_PER_DAY: Record<ZoomLevel, number> = {
  day: 36,
  week: 14,
  month: 5,
};

export const ROW_HEIGHT = 30;

/** Margen vertical entre el borde de la fila y la barra de una tarea. */
export const BAR_INSET = 5;
/** Distancia del centro de la fila al borde superior / inferior de una barra. */
export const BAR_HALF_HEIGHT = ROW_HEIGHT / 2 - BAR_INSET;

/** Lado del cuadrado que, girado 45°, forma el rombo de un hito. */
export const MILESTONE_SIZE = 9;
/** Distancia del centro del rombo a su vértice superior / inferior. */
export const MILESTONE_HALF_HEIGHT = (MILESTONE_SIZE * Math.SQRT2) / 2;

export interface DateRange {
  startISO: string;
  endISO: string;
  totalDays: number;
}

export function computeDateRange(tasks: Task[]): DateRange {
  if (tasks.length === 0) {
    const today = formatISODate(new Date());
    return { startISO: today, endISO: formatISODate(addDays(new Date(), 30)), totalDays: 30 };
  }
  const minStart = tasks.map((t) => t.startDate).reduce((a, b) => (a <= b ? a : b));
  const maxEnd = tasks.map((t) => t.endDate).reduce((a, b) => (a >= b ? a : b));
  const startISO = formatISODate(addDays(parseISODate(minStart), -3));
  const endISO = formatISODate(addDays(parseISODate(maxEnd), 7));
  const totalDays = daysBetween(startISO, endISO);
  return { startISO, endISO, totalDays };
}

export function daysBetween(aISO: string, bISO: string): number {
  return Math.round((parseISODate(bISO).getTime() - parseISODate(aISO).getTime()) / 86400000);
}

export function dateToX(dateISO: string, range: DateRange, pxPerDay: number): number {
  return daysBetween(range.startISO, dateISO) * pxPerDay;
}

/** Visual bar width covering the calendar span from start to end, inclusive of both dates. */
export function barWidth(startISO: string, endISO: string, pxPerDay: number): number {
  return Math.max((daysBetween(startISO, endISO) + 1) * pxPerDay, 2);
}
