import { describe, expect, it } from 'vitest';
import { reindexHierarchy, isSummaryTask, isMilestoneTask, childrenOf } from '../hierarchy';
import { makeTask } from './testUtils';

describe('reindexHierarchy', () => {
  it('asigna ids jerárquicos por orden y nivel', () => {
    const tasks = [
      makeTask({ uid: 'a', order: 0 }),
      makeTask({ uid: 'a1', parentUid: 'a', order: 0 }),
      makeTask({ uid: 'a2', parentUid: 'a', order: 1 }),
      makeTask({ uid: 'b', order: 1 }),
    ];
    const result = reindexHierarchy(tasks);
    const idByUid = Object.fromEntries(result.map((t) => [t.uid, t.id]));
    expect(idByUid).toEqual({ a: '1', a1: '1.1', a2: '1.2', b: '2' });
  });

  it('reordena cuando cambia `order`, no el orden original del array', () => {
    const tasks = [
      makeTask({ uid: 'b', order: 1 }),
      makeTask({ uid: 'a', order: 0 }),
    ];
    const result = reindexHierarchy(tasks);
    expect(result.map((t) => t.uid)).toEqual(['a', 'b']);
  });

  it('soporta 3 niveles de anidamiento', () => {
    const tasks = [
      makeTask({ uid: 'cap', order: 0 }),
      makeTask({ uid: 'sub', parentUid: 'cap', order: 0 }),
      makeTask({ uid: 'leaf', parentUid: 'sub', order: 0 }),
    ];
    const result = reindexHierarchy(tasks);
    const idByUid = Object.fromEntries(result.map((t) => [t.uid, t.id]));
    expect(idByUid).toEqual({ cap: '1', sub: '1.1', leaf: '1.1.1' });
  });
});

describe('isSummaryTask / isMilestoneTask', () => {
  it('una tarea con hijos es resumen (capítulo)', () => {
    const tasks = [makeTask({ uid: 'cap' }), makeTask({ uid: 'sub', parentUid: 'cap' })];
    expect(isSummaryTask(tasks, 'cap')).toBe(true);
    expect(isSummaryTask(tasks, 'sub')).toBe(false);
  });

  it('un hito es una tarea hoja con duración 0', () => {
    const hito = makeTask({ uid: 'h', durationDays: 0 });
    const tasks = [hito];
    expect(isMilestoneTask(tasks, hito)).toBe(true);
  });

  it('un capítulo con duración 0 no cuenta como hito', () => {
    const cap = makeTask({ uid: 'cap', durationDays: 0 });
    const sub = makeTask({ uid: 'sub', parentUid: 'cap' });
    const tasks = [cap, sub];
    expect(isMilestoneTask(tasks, cap)).toBe(false);
  });
});

describe('childrenOf', () => {
  it('devuelve los hijos directos ordenados', () => {
    const tasks = [
      makeTask({ uid: 'cap', order: 0 }),
      makeTask({ uid: 'b', parentUid: 'cap', order: 1 }),
      makeTask({ uid: 'a', parentUid: 'cap', order: 0 }),
    ];
    expect(childrenOf(tasks, 'cap').map((t) => t.uid)).toEqual(['a', 'b']);
  });
});
