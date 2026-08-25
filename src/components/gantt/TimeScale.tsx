import { addDays, format, getISODay, getISOWeek } from 'date-fns';
import { parseISODate, formatISODate } from '../../engine/dateMath';
import { dateToX, type DateRange, type ZoomLevel } from './ganttLayout';

interface TimeScaleProps {
  range: DateRange;
  pxPerDay: number;
  zoom: ZoomLevel;
  width: number;
}

interface MonthBand {
  label: string;
  x: number;
  width: number;
}

function monthBands(range: DateRange, pxPerDay: number): MonthBand[] {
  const bands: MonthBand[] = [];
  let cursor = parseISODate(range.startISO);
  const end = parseISODate(range.endISO);
  while (cursor <= end) {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const visibleStart = monthStart < parseISODate(range.startISO) ? parseISODate(range.startISO) : monthStart;
    const visibleEnd = monthEnd > end ? end : monthEnd;
    const x = dateToX(formatISODate(visibleStart), range, pxPerDay);
    const widthDays = Math.round((visibleEnd.getTime() - visibleStart.getTime()) / 86400000) + 1;
    bands.push({ label: format(monthStart, 'MMMM yyyy'), x, width: widthDays * pxPerDay });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return bands;
}

function ticks(range: DateRange, zoom: ZoomLevel): string[] {
  const result: string[] = [];
  const end = parseISODate(range.endISO);
  let cursor = parseISODate(range.startISO);
  if (zoom !== 'day') {
    while (getISODay(cursor) !== 1) cursor = addDays(cursor, 1);
  }
  const step = zoom === 'day' ? 1 : 7;
  while (cursor <= end) {
    result.push(formatISODate(cursor));
    cursor = addDays(cursor, step);
  }
  return result;
}

export function TimeScale({ range, pxPerDay, zoom, width }: TimeScaleProps) {
  const bands = monthBands(range, pxPerDay);
  const tickDates = ticks(range, zoom);
  const today = formatISODate(new Date());
  const showToday = today >= range.startISO && today <= range.endISO;

  return (
    <svg className="gantt-header" width={width} height={44}>
      {bands.map((b) => (
        <g key={b.label + b.x}>
          <rect x={b.x} y={0} width={b.width} height={20} fill="var(--surface)" stroke="var(--line)" />
          <text x={b.x + 6} y={14} className="gantt-month-label">
            {b.label}
          </text>
        </g>
      ))}
      {tickDates.map((d) => {
        const x = dateToX(d, range, pxPerDay);
        return (
          <g key={d}>
            <line x1={x} y1={20} x2={x} y2={44} stroke="var(--line)" />
            <text x={x + 3} y={32} className="gantt-tick-label">
              {zoom === 'day' ? format(parseISODate(d), 'd') : `Sem ${getISOWeek(parseISODate(d))}`}
            </text>
            {zoom !== 'day' && (
              <text x={x + 3} y={42} className="gantt-tick-sublabel">
                {format(parseISODate(d), 'dd/MM')}
              </text>
            )}
          </g>
        );
      })}
      {showToday && (
        <line
          x1={dateToX(today, range, pxPerDay)}
          y1={0}
          x2={dateToX(today, range, pxPerDay)}
          y2={44}
          stroke="var(--today-marker)"
          strokeWidth={1.5}
        />
      )}
    </svg>
  );
}
