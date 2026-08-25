import type { Task } from '../../types/task';
import type { CalendarConfig } from '../../types/project';
import { depthOf, isMilestoneTask, isSummaryTask } from '../../engine/hierarchy';
import { spanDays } from '../../engine/dateMath';
import { useProjectStore } from '../../store/useProjectStore';
import { PredecessorEditor } from './PredecessorEditor';
import { QuantityCell } from './QuantityCell';

interface GridRowProps {
  task: Task;
  allTasks: Task[];
  calendar: CalendarConfig;
  selected: boolean;
  onSelect: (uid: string) => void;
}

export function GridRow({ task, allTasks, calendar, selected, onSelect }: GridRowProps) {
  const updateTask = useProjectStore((s) => s.updateTask);
  const setManualStart = useProjectStore((s) => s.setManualStart);
  const setPredecessors = useProjectStore((s) => s.setPredecessors);
  const palette = useProjectStore((s) => s.palette);

  const summary = isSummaryTask(allTasks, task.uid);
  const milestone = isMilestoneTask(allTasks, task);
  const depth = depthOf(allTasks, task);
  const displayDuration = summary ? spanDays(task.startDate, task.endDate, calendar) : task.durationDays;

  const rowClass = [
    'grid-row',
    summary ? 'grid-row--summary' : '',
    milestone ? 'grid-row--milestone' : '',
    selected ? 'grid-row--selected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <tr className={rowClass} onClick={() => onSelect(task.uid)}>
      <td className="grid-cell grid-cell--item">{task.id}</td>
      <td className="grid-cell grid-cell--name" style={{ paddingLeft: `${8 + depth * 18}px` }}>
        <div className="name-cell-inner">
          {milestone && <span className="milestone-dot" aria-hidden />}
          <select
            className="color-swatch-select"
            value={task.colorKey ?? ''}
            onChange={(e) => updateTask(task.uid, { colorKey: e.target.value || undefined })}
            style={{
              backgroundColor: palette.find((p) => p.key === task.colorKey)?.color ?? 'var(--surface)',
            }}
            title="Rubro / color"
          >
            <option value="">—</option>
            {palette.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            className="grid-input grid-input--name"
            type="text"
            value={task.name}
            onChange={(e) => updateTask(task.uid, { name: e.target.value })}
          />
        </div>
      </td>
      <td className="grid-cell grid-cell--num">
        <QuantityCell quantity={task.quantity} onChange={(quantity) => updateTask(task.uid, { quantity })} />
      </td>
      <td className="grid-cell grid-cell--unit">
        <input
          className="grid-input grid-input--unit"
          type="text"
          value={task.unit ?? ''}
          onChange={(e) => updateTask(task.uid, { unit: e.target.value })}
        />
      </td>
      <td className="grid-cell grid-cell--num">
        {summary ? (
          <span className="grid-cell-readonly">{displayDuration}</span>
        ) : (
          <input
            className="grid-input grid-input--num"
            type="number"
            min={0}
            value={task.durationDays}
            onChange={(e) => updateTask(task.uid, { durationDays: Math.max(0, Number(e.target.value)) })}
          />
        )}
      </td>
      <td className="grid-cell grid-cell--date">
        {summary ? (
          <span className="grid-cell-readonly">{task.startDate}</span>
        ) : (
          <div className="grid-date-field">
            <button
              type="button"
              className={`manual-pin ${task.manualStart ? 'manual-pin--active' : ''}`}
              title={task.manualStart ? 'Fecha fijada manualmente (click para volver a automático)' : 'Fijar fecha manualmente'}
              onClick={(e) => {
                e.stopPropagation();
                setManualStart(task.uid, !task.manualStart);
              }}
            >
              {task.manualStart ? '📌' : '⚬'}
            </button>
            <input
              className="grid-input grid-input--date"
              type="date"
              value={task.startDate}
              onChange={(e) => setManualStart(task.uid, true, e.target.value)}
            />
            {task.conflictWarning && (
              <span className="conflict-flag" title={task.conflictWarning}>
                ⚠
              </span>
            )}
          </div>
        )}
      </td>
      <td className="grid-cell grid-cell--date">
        <span className="grid-cell-readonly">{task.endDate}</span>
      </td>
      <td className="grid-cell grid-cell--pred">
        <PredecessorEditor
          taskUid={task.uid}
          predecessors={task.predecessors}
          tasks={allTasks}
          disabled={summary}
          onChange={(predecessors) => setPredecessors(task.uid, predecessors)}
        />
      </td>
    </tr>
  );
}
