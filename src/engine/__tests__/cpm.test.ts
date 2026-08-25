import { describe, expect, it } from 'vitest';
import { resolveSchedule } from '../schedule';
import { computeCriticalPath } from '../cpm';
import { HABILES, makeTask, pred } from './testUtils';

function schedule(tasks: ReturnType<typeof makeTask>[]) {
  const { tasks: resolved, issue } = resolveSchedule(tasks, HABILES);
  expect(issue).toBeUndefined();
  const { tasks: withCpm } = computeCriticalPath(resolved, HABILES);
  return Object.fromEntries(withCpm.map((t) => [t.uid, t]));
}

describe('computeCriticalPath', () => {
  it('una cadena lineal simple es 100% crítica', () => {
    const A = makeTask({ uid: 'A', order: 0, startDate: '2026-01-05', durationDays: 2 });
    const B = makeTask({ uid: 'B', order: 1, durationDays: 2, predecessors: [pred('A', 'FS', 0)] });
    const C = makeTask({ uid: 'C', order: 2, durationDays: 1, predecessors: [pred('B', 'FS', 0)] });
    const byUid = schedule([A, B, C]);
    expect(byUid.A.isCritical).toBe(true);
    expect(byUid.B.isCritical).toBe(true);
    expect(byUid.C.isCritical).toBe(true);
    expect(byUid.A.slackDays).toBe(0);
    expect(byUid.C.slackDays).toBe(0);
  });

  it('una rama en paralelo que termina antes de lo necesario tiene holgura y no es crítica', () => {
    const A = makeTask({ uid: 'A', order: 0, startDate: '2026-01-05', durationDays: 5 }); // camino largo
    const B = makeTask({ uid: 'B', order: 1, durationDays: 1, predecessors: [pred('A', 'FS', 0)] });
    // D es una rama corta e independiente que también alimenta a C, pero termina mucho antes
    const D = makeTask({ uid: 'D', order: 2, startDate: '2026-01-05', durationDays: 1 });
    const C = makeTask({
      uid: 'C',
      order: 3,
      durationDays: 1,
      predecessors: [pred('B', 'FS', 0), pred('D', 'FS', 0)],
    });
    const byUid = schedule([A, D, B, C]);
    expect(byUid.A.isCritical).toBe(true);
    expect(byUid.B.isCritical).toBe(true);
    expect(byUid.C.isCritical).toBe(true);
    expect(byUid.D.isCritical).toBe(false);
    expect(byUid.D.slackDays).toBeGreaterThan(0);
  });

  it('una tarea aislada sin vínculos tiene holgura si no determina el fin del proyecto', () => {
    const A = makeTask({ uid: 'A', order: 0, startDate: '2026-01-05', durationDays: 10 });
    const E = makeTask({ uid: 'E', order: 1, startDate: '2026-01-05', durationDays: 1 });
    const byUid = schedule([A, E]);
    expect(byUid.A.isCritical).toBe(true);
    expect(byUid.E.isCritical).toBe(false);
    expect(byUid.E.slackDays).toBeGreaterThan(0);
  });
});
