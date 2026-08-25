import type { LinkType, Task } from '../types/task';
import type { CalendarConfig } from '../types/project';
import { addWorkingDays, endFromDuration, minISODate, spanDays, startFromDuration } from './dateMath';

export interface CpmResult {
  tasks: Task[];
}

interface SuccessorLink {
  uid: string;
  type: LinkType;
  lagDays: number;
}

/** Mirrors predecessorConstraint() from schedule.ts, but backward: given a successor's late
 * dates, what's the latest this task could finish (or start) without delaying it. */
function backwardConstraint(
  link: SuccessorLink,
  succLateStart: string,
  succLateEnd: string,
  calendar: CalendarConfig,
): { kind: 'start' | 'end'; date: string } {
  switch (link.type) {
    case 'FS':
      return { kind: 'end', date: addWorkingDays(succLateStart, -(link.lagDays + 1), calendar) };
    case 'SS':
      return { kind: 'start', date: addWorkingDays(succLateStart, -link.lagDays, calendar) };
    case 'FF':
      return { kind: 'end', date: addWorkingDays(succLateEnd, -link.lagDays, calendar) };
    case 'SF':
      return { kind: 'start', date: addWorkingDays(succLateEnd, -link.lagDays, calendar) };
  }
}

/**
 * Computes total slack and critical-path flag for every task, from explicit predecessor links
 * only (chapter/hierarchy aggregation is ignored here — it's a display rollup, not a
 * scheduling constraint). Assumes `tasks` already went through resolveSchedule (early dates
 * populated) and contains no dependency cycles.
 */
export function computeCriticalPath(allTasks: Task[], calendar: CalendarConfig): CpmResult {
  if (allTasks.length === 0) return { tasks: allTasks };

  const byUid = new Map(allTasks.map((t) => [t.uid, t]));
  const successors = new Map<string, SuccessorLink[]>();
  const indegree = new Map<string, number>();
  for (const t of allTasks) {
    successors.set(t.uid, []);
    indegree.set(t.uid, 0);
  }
  for (const t of allTasks) {
    for (const pred of t.predecessors) {
      if (!byUid.has(pred.taskUid)) continue;
      successors.get(pred.taskUid)!.push({ uid: t.uid, type: pred.type, lagDays: pred.lagDays });
      indegree.set(t.uid, (indegree.get(t.uid) ?? 0) + 1);
    }
  }

  const order = allTasks.map((t) => t.uid);
  const orderIndex = new Map(order.map((uid, i) => [uid, i]));
  const queue = order.filter((uid) => indegree.get(uid) === 0);
  const inQueue = new Set(queue);
  const topo: string[] = [];
  while (queue.length > 0) {
    queue.sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0));
    const uid = queue.shift()!;
    inQueue.delete(uid);
    topo.push(uid);
    for (const s of successors.get(uid) ?? []) {
      indegree.set(s.uid, (indegree.get(s.uid) ?? 0) - 1);
      if (indegree.get(s.uid) === 0 && !inQueue.has(s.uid)) {
        queue.push(s.uid);
        inQueue.add(s.uid);
      }
    }
  }
  if (topo.length !== allTasks.length) {
    // A cycle exists; resolveSchedule() already surfaces this as a user-facing error.
    return { tasks: allTasks };
  }

  const projectEnd = allTasks.map((t) => t.endDate).reduce((a, b) => (a >= b ? a : b));
  const lateStart = new Map<string, string>();
  const lateEnd = new Map<string, string>();

  for (let i = topo.length - 1; i >= 0; i -= 1) {
    const uid = topo[i];
    const task = byUid.get(uid)!;
    const duration = task.durationDays;
    const succLinks = successors.get(uid) ?? [];

    const candidateEnds: string[] = [];
    for (const link of succLinks) {
      const succLateStart = lateStart.get(link.uid);
      const succLateEnd = lateEnd.get(link.uid);
      if (!succLateStart || !succLateEnd) continue;
      const c = backwardConstraint(link, succLateStart, succLateEnd, calendar);
      candidateEnds.push(c.kind === 'end' ? c.date : endFromDuration(c.date, duration, calendar));
    }

    const end = candidateEnds.length > 0 ? candidateEnds.reduce(minISODate) : projectEnd;
    const start = startFromDuration(end, duration, calendar);
    lateStart.set(uid, start);
    lateEnd.set(uid, end);
  }

  const tasks = allTasks.map((t) => {
    const ls = lateStart.get(t.uid) ?? t.startDate;
    const slackDays = ls >= t.startDate ? Math.max(0, spanDays(t.startDate, ls, calendar) - 1) : 0;
    return { ...t, slackDays, isCritical: slackDays === 0 };
  });

  return { tasks };
}
