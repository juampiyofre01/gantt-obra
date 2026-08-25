import type { Task } from '../../types/task';
import { isSummaryTask } from '../../engine/hierarchy';
import { ROW_HEIGHT } from './ganttLayout';

interface BarLayout {
  x: number;
  width: number;
  y: number;
}

interface DependencyArrowsProps {
  tasks: Task[];
  layout: Map<string, BarLayout>;
  showCriticalPath: boolean;
}

const STUB = 14;

function elbowPath(sx: number, sy: number, tx: number, ty: number, exitRight: boolean): string {
  const midX = exitRight ? Math.max(sx + STUB, tx - STUB) : Math.min(sx - STUB, tx + STUB);
  return `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ty} L ${tx} ${ty}`;
}

export function DependencyArrows({ tasks, layout, showCriticalPath }: DependencyArrowsProps) {
  const byUid = new Map(tasks.map((t) => [t.uid, t]));

  const arrows = tasks.flatMap((task) => {
    const succPos = layout.get(task.uid);
    if (!succPos) return [];
    // Los capítulos derivan sus fechas de sus hijos: sus propias predecesoras no afectan el
    // cálculo, así que tampoco deben dibujarse (evita flechas "fantasma" sin efecto real).
    if (isSummaryTask(tasks, task.uid)) return [];
    return task.predecessors.flatMap((pred, i) => {
      const predTask = byUid.get(pred.taskUid);
      const predPos = layout.get(pred.taskUid);
      if (!predTask || !predPos) return [];

      const exitRight = pred.type === 'FS' || pred.type === 'FF';
      const enterLeft = pred.type === 'FS' || pred.type === 'SS';
      const sx = exitRight ? predPos.x + predPos.width : predPos.x;
      const sy = predPos.y + ROW_HEIGHT / 2;
      const tx = enterLeft ? succPos.x : succPos.x + succPos.width;
      const ty = succPos.y + ROW_HEIGHT / 2;

      const critical = showCriticalPath && task.isCritical && predTask.isCritical;
      const d = elbowPath(sx, sy, tx, ty, exitRight);

      return [
        <path
          key={`${pred.taskUid}->${task.uid}-${i}`}
          d={d}
          fill="none"
          stroke={critical ? 'var(--accent-critical)' : 'var(--ink-500)'}
          strokeWidth={critical ? 2 : 1.25}
          markerEnd={critical ? 'url(#arrowhead-critical)' : 'url(#arrowhead)'}
        />,
      ];
    });
  });

  return <>{arrows}</>;
}
