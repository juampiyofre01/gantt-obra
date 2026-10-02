import { addDays, addMonths, differenceInCalendarDays, startOfISOWeek, startOfMonth } from 'date-fns';
import { formatISODate, parseISODate } from '../engine/dateMath';
import type { TimeScaleUnit } from './exportLayout';

/** Una columna del Gantt impreso: un día, una semana (lunes a domingo) o un mes calendario. */
export interface TimeColumn {
  startISO: string;
  /** Primer día de la columna siguiente (límite exclusivo). */
  endISO: string;
  days: number;
}

/** Divide el rango en columnas de la unidad elegida. Semanas y meses se alinean al lunes / día 1
 * anterior al inicio del rango, así ninguna columna queda cortada a la mitad. */
export function buildTimeColumns(rangeStartISO: string, rangeEndISO: string, unit: TimeScaleUnit): TimeColumn[] {
  const rangeStart = parseISODate(rangeStartISO);
  const rangeEnd = parseISODate(rangeEndISO);
  const next = (d: Date) => (unit === 'day' ? addDays(d, 1) : unit === 'week' ? addDays(d, 7) : addMonths(d, 1));

  let cursor = unit === 'day' ? rangeStart : unit === 'week' ? startOfISOWeek(rangeStart) : startOfMonth(rangeStart);
  const columns: TimeColumn[] = [];
  while (cursor <= rangeEnd) {
    const following = next(cursor);
    columns.push({
      startISO: formatISODate(cursor),
      endISO: formatISODate(following),
      days: differenceInCalendarDays(following, cursor),
    });
    cursor = following;
  }
  return columns;
}

/** Reparte las columnas en hojas: cada hoja lleva todas las columnas que entran en el ancho
 * disponible, sin partir ninguna. */
export function packTimeColumns(columns: TimeColumn[], mmPerDay: number, areaWidthMm: number): TimeColumn[][] {
  const tiles: TimeColumn[][] = [];
  let current: TimeColumn[] = [];
  let usedMm = 0;
  for (const col of columns) {
    const widthMm = col.days * mmPerDay;
    if (current.length > 0 && usedMm + widthMm > areaWidthMm) {
      tiles.push(current);
      current = [];
      usedMm = 0;
    }
    current.push(col);
    usedMm += widthMm;
  }
  if (current.length > 0) tiles.push(current);
  return tiles;
}
