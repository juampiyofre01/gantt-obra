import type { CalendarConfig } from '../../types/project';
import type { Predecessor, Task } from '../../types/task';

export function makeTask(overrides: Partial<Task> & { uid: string }): Task {
  return {
    id: overrides.uid,
    parentUid: null,
    order: 0,
    name: overrides.uid,
    durationDays: 1,
    startDate: '2026-01-05', // a Monday
    endDate: '2026-01-05',
    manualStart: false,
    predecessors: [],
    percentComplete: 0,
    ...overrides,
  };
}

export function pred(taskUid: string, type: Predecessor['type'] = 'FS', lagDays = 0): Predecessor {
  return { taskUid, type, lagDays };
}

export const CORRIDOS: CalendarConfig = { workOnWeekends: true, holidays: [] };
export const HABILES: CalendarConfig = { workOnWeekends: false, holidays: [] };
