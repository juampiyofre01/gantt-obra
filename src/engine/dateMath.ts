import { addDays, format, parseISO } from 'date-fns';
import type { CalendarConfig } from '../types/project';

export function parseISODate(iso: string): Date {
  return parseISO(iso);
}

export function formatISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function isWorkDay(date: Date, calendar: CalendarConfig): boolean {
  if (calendar.workOnWeekends) return true;
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  if (calendar.holidays.includes(formatISODate(date))) return false;
  return true;
}

/**
 * Advances (or goes back, if days < 0) `days` calendar/work units from startISO.
 * days = 0 returns startISO unchanged. The start date itself does not need to be a work day.
 */
export function addWorkingDays(startISO: string, days: number, calendar: CalendarConfig): string {
  if (days === 0) return startISO;
  let date = parseISODate(startISO);
  const step = days > 0 ? 1 : -1;
  let remaining = Math.abs(days);
  while (remaining > 0) {
    date = addDays(date, step);
    if (isWorkDay(date, calendar)) remaining -= 1;
  }
  return formatISODate(date);
}

/** End date for a task starting on startISO with the given duration (0 = hito, end = start). */
export function endFromDuration(startISO: string, durationDays: number, calendar: CalendarConfig): string {
  if (durationDays <= 0) return startISO;
  return addWorkingDays(startISO, durationDays - 1, calendar);
}

/** Start date implied by an end date and duration, counting backward. */
export function startFromDuration(endISO: string, durationDays: number, calendar: CalendarConfig): string {
  if (durationDays <= 0) return endISO;
  return addWorkingDays(endISO, -(durationDays - 1), calendar);
}

/** Inclusive count of counted days (work days if hábil, all days if corridos) between two ISO dates. */
export function spanDays(startISO: string, endISO: string, calendar: CalendarConfig): number {
  let date = parseISODate(startISO);
  const end = parseISODate(endISO);
  if (date > end) return 0;
  let count = 0;
  while (date <= end) {
    if (isWorkDay(date, calendar)) count += 1;
    date = addDays(date, 1);
  }
  return count;
}

/** ISO yyyy-MM-dd strings compare correctly with plain string comparison. */
export function maxISODate(a: string, b: string): string {
  return a >= b ? a : b;
}

export function minISODate(a: string, b: string): string {
  return a <= b ? a : b;
}
