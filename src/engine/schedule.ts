import type { Predecessor, Task } from '../types/task';
import type { CalendarConfig } from '../types/project';
import { addWorkingDays, endFromDuration, maxISODate, startFromDuration } from './dateMath';
import { isSummaryTask } from './hierarchy';

export interface ScheduleIssue {
  message: string;
  involvedUids: string[];
}

export interface ScheduleResult {
  tasks: Task[];
  issue?: ScheduleIssue;
}

interface Constraint {
  kind: 'start' | 'end';
  date: string;
}

/**
 * Translates one predecessor link into the date constraint it imposes on the successor.
 * FS/SS bound the successor's start directly; FF/SF bound its end directly.
 */
function predecessorConstraint(pred: Predecessor, predTask: Task, calendar: CalendarConfig): Constraint {
  switch (pred.type) {
    case 'FS':
      return { kind: 'start', date: addWorkingDays(predTask.endDate, pred.lagDays + 1, calendar) };
    case 'SS':
      return { kind: 'start', date: addWorkingDays(predTask.startDate, pred.lagDays, calendar) };
    case 'FF':
      return { kind: 'end', date: addWorkingDays(predTask.endDate, pred.lagDays, calendar) };
    case 'SF':
      return { kind: 'end', date: addWorkingDays(predTask.startDate, pred.lagDays, calendar) };
    default:
      throw new Error(`Tipo de vínculo desconocido: ${pred.type}`);
  }
}

/**
 * Combines every predecessor constraint into a single earliest start, honoring a fixed
 * duration. Start-constraints and end-constraints (converted to an equivalent start via the
 * duration) are unified onto "start" and the latest (max) one wins.
 */
function resolveFromConstraints(
  constraints: Constraint[],
  durationDays: number,
  calendar: CalendarConfig,
): { start: string; end: string } | null {
  if (constraints.length === 0) return null;
  const startCandidates = constraints.map((c) =>
    c.kind === 'start' ? c.date : startFromDuration(c.date, durationDays, calendar),
  );
  const start = startCandidates.reduce(maxISODate);
  return { start, end: endFromDuration(start, durationDays, calendar) };
}

/**
 * Recomputes start/end for every task from scratch: summary rows aggregate their children's
 * span, leaf tasks derive their dates from predecessor links (or keep their existing start if
 * unconstrained), and manualStart tasks keep their fixed start but get flagged with a
 * conflictWarning if it violates a predecessor constraint.
 */
export function resolveSchedule(allTasks: Task[], calendar: CalendarConfig): ScheduleResult {
  const byUid = new Map(allTasks.map((t) => [t.uid, t]));
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const t of allTasks) {
    indegree.set(t.uid, 0);
    adjacency.set(t.uid, []);
  }

  function addEdge(from: string, to: string) {
    if (!byUid.has(from) || !byUid.has(to)) return;
    adjacency.get(from)!.push(to);
    indegree.set(to, (indegree.get(to) ?? 0) + 1);
  }

  for (const t of allTasks) {
    const summary = isSummaryTask(allTasks, t.uid);
    if (!summary) {
      for (const pred of t.predecessors) addEdge(pred.taskUid, t.uid);
    }
    // Children must resolve before their parent chapter aggregates start/end.
    if (t.parentUid) addEdge(t.uid, t.parentUid);
  }

  const order = allTasks.map((t) => t.uid);
  const orderIndex = new Map(order.map((uid, i) => [uid, i]));
  const queue: string[] = order.filter((uid) => indegree.get(uid) === 0);
  const inQueue = new Set(queue);
  const topo: string[] = [];

  while (queue.length > 0) {
    queue.sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0));
    const uid = queue.shift()!;
    inQueue.delete(uid);
    topo.push(uid);
    for (const next of adjacency.get(uid) ?? []) {
      indegree.set(next, (indegree.get(next) ?? 0) - 1);
      if (indegree.get(next) === 0 && !inQueue.has(next)) {
        queue.push(next);
        inQueue.add(next);
      }
    }
  }

  if (topo.length !== allTasks.length) {
    const involvedUids = allTasks.map((t) => t.uid).filter((uid) => !topo.includes(uid));
    const involvedIds = involvedUids.map((uid) => byUid.get(uid)?.id ?? uid);
    return {
      tasks: allTasks,
      issue: {
        message: `Ciclo de dependencias detectado entre: ${involvedIds.join(', ')}`,
        involvedUids,
      },
    };
  }

  const resolved = new Map<string, Task>();
  for (const t of allTasks) resolved.set(t.uid, { ...t, conflictWarning: undefined });

  for (const uid of topo) {
    const task = resolved.get(uid)!;
    const summary = isSummaryTask(allTasks, uid);

    if (summary) {
      const children = allTasks.filter((t) => t.parentUid === uid).map((t) => resolved.get(t.uid)!);
      if (children.length > 0) {
        const start = children.map((c) => c.startDate).reduce((a, b) => (a <= b ? a : b));
        const end = children.map((c) => c.endDate).reduce((a, b) => (a >= b ? a : b));
        resolved.set(uid, { ...task, startDate: start, endDate: end });
      }
      continue;
    }

    const constraints: Constraint[] = task.predecessors
      .map((pred) => {
        const predTask = resolved.get(pred.taskUid);
        return predTask ? predecessorConstraint(pred, predTask, calendar) : null;
      })
      .filter((c): c is Constraint => c !== null);

    const computed = resolveFromConstraints(constraints, task.durationDays, calendar);

    if (task.manualStart) {
      const end = endFromDuration(task.startDate, task.durationDays, calendar);
      let conflictWarning: string | undefined;
      if (computed && task.startDate < computed.start) {
        conflictWarning = `El inicio manual (${task.startDate}) es anterior a lo que exigen sus predecesoras (mínimo ${computed.start}).`;
      }
      resolved.set(uid, { ...task, endDate: end, conflictWarning });
    } else if (computed) {
      resolved.set(uid, { ...task, startDate: computed.start, endDate: computed.end });
    } else {
      resolved.set(uid, { ...task, endDate: endFromDuration(task.startDate, task.durationDays, calendar) });
    }
  }

  return { tasks: allTasks.map((t) => resolved.get(t.uid)!) };
}
