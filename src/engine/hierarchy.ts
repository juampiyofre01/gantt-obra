import type { Task } from '../types/task';

/**
 * Recomputes the hierarchical display id (1, 1.1, 1.2, 2...) and sibling `order` for every
 * task, and returns the array flattened in depth-first document order. Call this after any
 * structural mutation (add/remove/indent/outdent/reorder).
 */
export function reindexHierarchy(tasks: Task[]): Task[] {
  const byParent = new Map<string | null, Task[]>();
  for (const t of tasks) {
    const key = t.parentUid;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(t);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.order - b.order);

  const result: Task[] = [];
  function visit(parentUid: string | null, prefix: string) {
    const children = byParent.get(parentUid) ?? [];
    children.forEach((t, idx) => {
      const id = prefix ? `${prefix}.${idx + 1}` : `${idx + 1}`;
      result.push({ ...t, id, order: idx });
      visit(t.uid, id);
    });
  }
  visit(null, '');
  return result;
}

export function isSummaryTask(tasks: Task[], uid: string): boolean {
  return tasks.some((t) => t.parentUid === uid);
}

export function isMilestoneTask(tasks: Task[], task: Task): boolean {
  return task.durationDays === 0 && !isSummaryTask(tasks, task.uid);
}

export function childrenOf(tasks: Task[], uid: string): Task[] {
  return tasks.filter((t) => t.parentUid === uid).sort((a, b) => a.order - b.order);
}

export function descendantsOf(tasks: Task[], uid: string): Task[] {
  const direct = childrenOf(tasks, uid);
  return direct.flatMap((t) => [t, ...descendantsOf(tasks, t.uid)]);
}

export function depthOf(tasks: Task[], task: Task): number {
  const byUid = new Map(tasks.map((t) => [t.uid, t]));
  let depth = 0;
  let current = task;
  while (current.parentUid) {
    const parent = byUid.get(current.parentUid);
    if (!parent) break;
    depth += 1;
    current = parent;
  }
  return depth;
}
