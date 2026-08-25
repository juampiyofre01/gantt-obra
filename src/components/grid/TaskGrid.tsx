import type { Task } from '../../types/task';
import type { CalendarConfig } from '../../types/project';
import { GridRow } from './GridRow';
import { ColumnResizeHandle } from './ColumnResizeHandle';
import { PREDECESSOR_LEGEND } from './PredecessorEditor';
import { COLUMN_LABELS, useColumnWidths } from '../../store/useColumnWidths';

interface TaskGridProps {
  tasks: Task[];
  calendar: CalendarConfig;
  selectedUid: string | null;
  onSelect: (uid: string) => void;
}

export function TaskGrid({ tasks, calendar, selectedUid, onSelect }: TaskGridProps) {
  const widths = useColumnWidths((s) => s.widths);

  return (
    <table className="task-grid">
      <colgroup>
        <col style={{ width: widths.id }} />
        <col style={{ width: widths.name }} />
        <col style={{ width: widths.qty }} />
        <col style={{ width: widths.unit }} />
        <col style={{ width: widths.dur }} />
        <col style={{ width: widths.start }} />
        <col style={{ width: widths.end }} />
        <col style={{ width: widths.pred }} />
      </colgroup>
      <thead>
        <tr>
          <th className="grid-cell--item">
            {COLUMN_LABELS.id}
            <ColumnResizeHandle columnKey="id" />
          </th>
          <th className="grid-cell--name">
            {COLUMN_LABELS.name}
            <ColumnResizeHandle columnKey="name" />
          </th>
          <th className="grid-cell--num">
            {COLUMN_LABELS.qty}
            <ColumnResizeHandle columnKey="qty" />
          </th>
          <th className="grid-cell--unit">
            {COLUMN_LABELS.unit}
            <ColumnResizeHandle columnKey="unit" />
          </th>
          <th className="grid-cell--num">
            {COLUMN_LABELS.dur}
            <ColumnResizeHandle columnKey="dur" />
          </th>
          <th className="grid-cell--date">
            {COLUMN_LABELS.start}
            <ColumnResizeHandle columnKey="start" />
          </th>
          <th className="grid-cell--date">
            {COLUMN_LABELS.end}
            <ColumnResizeHandle columnKey="end" />
          </th>
          <th className="grid-cell--pred" title={PREDECESSOR_LEGEND}>
            {COLUMN_LABELS.pred} ⓘ
            <ColumnResizeHandle columnKey="pred" />
          </th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <GridRow
            key={task.uid}
            task={task}
            allTasks={tasks}
            calendar={calendar}
            selected={task.uid === selectedUid}
            onSelect={onSelect}
          />
        ))}
      </tbody>
    </table>
  );
}
