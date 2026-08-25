import { describe, expect, it } from 'vitest';
import { resolveSchedule } from '../schedule';
import { HABILES, makeTask, pred } from './testUtils';

describe('resolveSchedule — vínculos', () => {
  const A = makeTask({ uid: 'A', order: 0, startDate: '2026-01-05', durationDays: 3 });

  it('FS (default, lag 0): sucesora arranca el hábil siguiente al fin de la antecesora', () => {
    const B = makeTask({ uid: 'B', order: 1, durationDays: 2, predecessors: [pred('A', 'FS', 0)] });
    const { tasks, issue } = resolveSchedule([A, B], HABILES);
    expect(issue).toBeUndefined();
    const a = tasks.find((t) => t.uid === 'A')!;
    const b = tasks.find((t) => t.uid === 'B')!;
    expect(a.endDate).toBe('2026-01-07');
    expect(b.startDate).toBe('2026-01-08');
  });

  it('FS con lag positivo (adelanto negativo) corre el inicio', () => {
    const B = makeTask({ uid: 'B', order: 1, durationDays: 2, predecessors: [pred('A', 'FS', 2)] });
    const { tasks } = resolveSchedule([A, B], HABILES);
    expect(tasks.find((t) => t.uid === 'B')!.startDate).toBe('2026-01-12');
  });

  it('SS: sucesora arranca junto con la antecesora', () => {
    const B = makeTask({ uid: 'B', order: 1, durationDays: 2, predecessors: [pred('A', 'SS', 0)] });
    const { tasks } = resolveSchedule([A, B], HABILES);
    expect(tasks.find((t) => t.uid === 'B')!.startDate).toBe('2026-01-05');
  });

  it('FF: sucesora termina junto con la antecesora', () => {
    const B = makeTask({ uid: 'B', order: 1, durationDays: 2, predecessors: [pred('A', 'FF', 0)] });
    const { tasks } = resolveSchedule([A, B], HABILES);
    const b = tasks.find((t) => t.uid === 'B')!;
    expect(b.endDate).toBe('2026-01-07');
    expect(b.startDate).toBe('2026-01-06');
  });

  it('SF: el fin de la sucesora coincide con el inicio de la antecesora', () => {
    const B = makeTask({ uid: 'B', order: 1, durationDays: 2, predecessors: [pred('A', 'SF', 0)] });
    const { tasks } = resolveSchedule([A, B], HABILES);
    const b = tasks.find((t) => t.uid === 'B')!;
    expect(b.endDate).toBe('2026-01-05');
    expect(b.startDate).toBe('2026-01-02');
  });

  it('múltiples predecesoras: gana la restricción más tardía', () => {
    const C = makeTask({ uid: 'C', order: 1, startDate: '2026-01-05', durationDays: 1 });
    const B = makeTask({
      uid: 'B',
      order: 2,
      durationDays: 1,
      predecessors: [pred('A', 'FS', 0), pred('C', 'FS', 5)],
    });
    const { tasks } = resolveSchedule([A, C, B], HABILES);
    const b = tasks.find((t) => t.uid === 'B')!;
    // A.end=01-07 -> FS -> 01-08; C.end=01-05 -> FS lag5 -> más tarde que 01-08
    const c = tasks.find((t) => t.uid === 'C')!;
    expect(b.startDate > c.endDate).toBe(true);
  });
});

describe('resolveSchedule — capítulos (filas resumen)', () => {
  it('un capítulo enrolla el rango de sus hijos', () => {
    const cap = makeTask({ uid: 'cap', order: 0, startDate: '2026-01-01' });
    const s1 = makeTask({ uid: 's1', parentUid: 'cap', order: 0, startDate: '2026-01-05', durationDays: 2 });
    const s2 = makeTask({ uid: 's2', parentUid: 'cap', order: 1, startDate: '2026-01-08', durationDays: 3 });
    const { tasks } = resolveSchedule([cap, s1, s2], HABILES);
    const capResolved = tasks.find((t) => t.uid === 'cap')!;
    const s1r = tasks.find((t) => t.uid === 's1')!;
    const s2r = tasks.find((t) => t.uid === 's2')!;
    expect(capResolved.startDate).toBe(s1r.startDate);
    expect(capResolved.endDate).toBe(s2r.endDate);
  });

  it('una sucesora puede depender del fin de un capítulo completo', () => {
    const cap = makeTask({ uid: 'cap', order: 0, startDate: '2026-01-01' });
    const s1 = makeTask({ uid: 's1', parentUid: 'cap', order: 0, startDate: '2026-01-05', durationDays: 3 });
    const next = makeTask({
      uid: 'next',
      order: 1,
      durationDays: 1,
      predecessors: [pred('cap', 'FS', 0)],
    });
    const { tasks, issue } = resolveSchedule([cap, s1, next], HABILES);
    expect(issue).toBeUndefined();
    const capResolved = tasks.find((t) => t.uid === 'cap')!;
    const nextResolved = tasks.find((t) => t.uid === 'next')!;
    expect(nextResolved.startDate > capResolved.endDate).toBe(true);
  });
});

describe('resolveSchedule — fecha manual y conflictos', () => {
  const A = makeTask({ uid: 'A', order: 0, startDate: '2026-01-05', durationDays: 3 });

  it('respeta manualStart y no lo sobreescribe', () => {
    const B = makeTask({
      uid: 'B',
      order: 1,
      durationDays: 2,
      manualStart: true,
      startDate: '2026-02-01',
      predecessors: [pred('A', 'FS', 0)],
    });
    const { tasks } = resolveSchedule([A, B], HABILES);
    expect(tasks.find((t) => t.uid === 'B')!.startDate).toBe('2026-02-01');
  });

  it('marca conflictWarning si la fecha manual es anterior a lo que exige el vínculo', () => {
    const B = makeTask({
      uid: 'B',
      order: 1,
      durationDays: 2,
      manualStart: true,
      startDate: '2026-01-05', // antes de que A termine
      predecessors: [pred('A', 'FS', 0)],
    });
    const { tasks } = resolveSchedule([A, B], HABILES);
    expect(tasks.find((t) => t.uid === 'B')!.conflictWarning).toBeDefined();
  });

  it('no hay conflictWarning si la fecha manual cumple el vínculo', () => {
    const B = makeTask({
      uid: 'B',
      order: 1,
      durationDays: 2,
      manualStart: true,
      startDate: '2026-01-20',
      predecessors: [pred('A', 'FS', 0)],
    });
    const { tasks } = resolveSchedule([A, B], HABILES);
    expect(tasks.find((t) => t.uid === 'B')!.conflictWarning).toBeUndefined();
  });
});

describe('resolveSchedule — ciclos', () => {
  it('detecta un ciclo de dependencias y no crashea', () => {
    const x = makeTask({ uid: 'x', order: 0, predecessors: [pred('y', 'FS', 0)] });
    const y = makeTask({ uid: 'y', order: 1, predecessors: [pred('x', 'FS', 0)] });
    const { issue } = resolveSchedule([x, y], HABILES);
    expect(issue).toBeDefined();
    expect(issue!.involvedUids.sort()).toEqual(['x', 'y']);
  });
});
