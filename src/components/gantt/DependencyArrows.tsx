import type { Task } from '../../types/task';
import { isSummaryTask } from '../../engine/hierarchy';
import { dependencyPath, type RouteBar } from './dependencyRoute';
import { ROW_HEIGHT } from './ganttLayout';

interface DependencyArrowsProps {
  tasks: Task[];
  layout: Map<string, RouteBar>;
  showCriticalPath: boolean;
}

const STUB = 14;

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

      const critical = showCriticalPath && task.isCritical && predTask.isCritical;
      const d = dependencyPath(pred.type, predPos, succPos, ROW_HEIGHT, STUB);

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
