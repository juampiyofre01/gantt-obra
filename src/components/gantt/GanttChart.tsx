import { forwardRef, useMemo } from 'react';
import { addDays } from 'date-fns';
import type { Task } from '../../types/task';
import type { CalendarConfig, RubroPaletteEntry } from '../../types/project';
import { isMilestoneTask, isSummaryTask } from '../../engine/hierarchy';
import { formatISODate, parseISODate } from '../../engine/dateMath';
import { barWidth, computeDateRange, dateToX, PX_PER_DAY, ROW_HEIGHT, type ZoomLevel } from './ganttLayout';
import { TimeScale } from './TimeScale';
import { TaskBar } from './TaskBar';
import { SummaryBar } from './SummaryBar';
import { MilestoneMarker } from './MilestoneMarker';
import { DependencyArrows } from './DependencyArrows';

interface GanttChartProps {
  tasks: Task[];
  calendar: CalendarConfig;
  palette: RubroPaletteEntry[];
  zoom: ZoomLevel;
  showCriticalPath: boolean;
  selectedUid: string | null;
  onSelect: (uid: string) => void;
  onScroll?: (scrollTop: number) => void;
}

export const GanttChart = forwardRef<HTMLDivElement, GanttChartProps>(function GanttChart(
  { tasks, calendar, palette, zoom, showCriticalPath, selectedUid, onSelect, onScroll },
  ref,
) {
  const range = useMemo(() => computeDateRange(tasks), [tasks]);
  const pxPerDay = PX_PER_DAY[zoom];
  const totalWidth = range.totalDays * pxPerDay;
  const totalHeight = Math.max(tasks.length * ROW_HEIGHT, 1);
  const colorByKey = new Map(palette.map((p) => [p.key, p.color]));

  const layout = useMemo(() => {
    const map = new Map<string, { x: number; width: number; y: number }>();
    tasks.forEach((t, i) => {
      map.set(t.uid, {
        x: dateToX(t.startDate, range, pxPerDay),
        width: barWidth(t.startDate, t.endDate, pxPerDay),
        y: i * ROW_HEIGHT,
      });
    });
    return map;
  }, [tasks, range, pxPerDay]);

  const weekendBands = useMemo(() => {
    if (calendar.workOnWeekends) return []; // días corridos: el fin de semana no tiene un significado especial
    const bands: number[] = [];
    let cursor = parseISODate(range.startISO);
    const end = parseISODate(range.endISO);
    while (cursor <= end) {
      const day = cursor.getDay();
      if (day === 0 || day === 6) bands.push(dateToX(formatISODate(cursor), range, pxPerDay));
      cursor = addDays(cursor, 1);
    }
    return bands;
  }, [range, pxPerDay, calendar.workOnWeekends]);

  const today = formatISODate(new Date());
  const showToday = today >= range.startISO && today <= range.endISO;

  return (
    <div className="gantt-scroll" ref={ref} onScroll={(e) => onScroll?.(e.currentTarget.scrollTop)}>
      <div style={{ width: totalWidth }}>
        <TimeScale range={range} pxPerDay={pxPerDay} zoom={zoom} width={totalWidth} />
        <svg className="gantt-body" width={totalWidth} height={totalHeight}>
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="var(--ink-500)" />
            </marker>
            <marker id="arrowhead-critical" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="var(--accent-critical)" />
            </marker>
          </defs>

          {weekendBands.map((x) => (
            <rect key={x} x={x} y={0} width={pxPerDay} height={totalHeight} fill="var(--grid-weekend)" />
          ))}

          {tasks.map((task, i) =>
            task.uid === selectedUid ? (
              <rect
                key={`row-${task.uid}`}
                x={0}
                y={i * ROW_HEIGHT}
                width={totalWidth}
                height={ROW_HEIGHT}
                fill="color-mix(in srgb, var(--accent-primary) 10%, transparent)"
              />
            ) : null,
          )}

          {showToday && (
            <line
              x1={dateToX(today, range, pxPerDay)}
              y1={0}
              x2={dateToX(today, range, pxPerDay)}
              y2={totalHeight}
              stroke="var(--today-marker)"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          )}

          <DependencyArrows tasks={tasks} layout={layout} showCriticalPath={showCriticalPath} />

          {tasks.map((task) => {
            const pos = layout.get(task.uid)!;
            const summary = isSummaryTask(tasks, task.uid);
            const milestone = isMilestoneTask(tasks, task);
            const critical = showCriticalPath && Boolean(task.isCritical);

            if (milestone) {
              return (
                <MilestoneMarker
                  key={task.uid}
                  x={pos.x}
                  y={pos.y}
                  critical={critical}
                  label={task.name}
                  onClick={() => onSelect(task.uid)}
                />
              );
            }
            if (summary) {
              return <SummaryBar key={task.uid} x={pos.x} y={pos.y} width={pos.width} onClick={() => onSelect(task.uid)} />;
            }
            const color = task.colorKey ? colorByKey.get(task.colorKey) : undefined;
            return (
              <TaskBar
                key={task.uid}
                x={pos.x}
                y={pos.y}
                width={pos.width}
                color={color}
                percent={task.percentComplete}
                critical={critical}
                selected={task.uid === selectedUid}
                onClick={() => onSelect(task.uid)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
});
