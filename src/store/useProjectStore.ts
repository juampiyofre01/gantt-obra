import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { CalendarConfig, ProjectFile, ProjectMeta, RubroPaletteEntry } from '../types/project';
import { SCHEMA_VERSION } from '../types/project';
import type { Predecessor, Task } from '../types/task';
import { childrenOf, descendantsOf, reindexHierarchy } from '../engine/hierarchy';
import { resolveSchedule } from '../engine/schedule';
import { computeCriticalPath } from '../engine/cpm';
import { loadFromLocalStorage, saveToLocalStorage } from './persistence';

const DEFAULT_CALENDAR: CalendarConfig = { workOnWeekends: false, holidays: [] };
const DEFAULT_META: ProjectMeta = { title: 'Nuevo cronograma de obra' };

export const DEFAULT_PALETTE: RubroPaletteEntry[] = [
  { key: 'preliminares', label: 'Trabajos preliminares', color: '#6fa287' },
  { key: 'movimiento-suelos', label: 'Movimiento de suelos', color: '#6fa8c9' },
  { key: 'hidraulica', label: 'Obra hidráulica', color: '#e0975f' },
  { key: 'estructuras', label: 'Estructuras', color: '#9b8bc4' },
  { key: 'electrica', label: 'Eléctrica / instrumentación', color: '#d6b34a' },
  { key: 'civil-varios', label: 'Civil varios', color: '#8fa0ad' },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function makeTaskDefaults(overrides: Partial<Task> & { uid: string }): Task {
  return {
    id: overrides.uid,
    parentUid: null,
    order: 0,
    name: 'Nueva tarea',
    durationDays: 1,
    startDate: todayISO(),
    endDate: todayISO(),
    manualStart: false,
    predecessors: [],
    percentComplete: 0,
    ...overrides,
  };
}

function seedTasks(): Task[] {
  const cap1 = nanoid();
  const t11 = nanoid();
  const t12 = nanoid();
  const cap2 = nanoid();
  const t21 = nanoid();
  const t22 = nanoid();
  const hito = nanoid();
  const start = todayISO();

  return [
    makeTaskDefaults({ uid: cap1, order: 0, name: 'TRABAJOS PRELIMINARES', startDate: start }),
    makeTaskDefaults({
      uid: t11,
      parentUid: cap1,
      order: 0,
      name: 'Obrador y cerco de obra',
      unit: 'gl',
      quantity: 1,
      durationDays: 5,
      startDate: start,
      colorKey: 'preliminares',
    }),
    makeTaskDefaults({
      uid: t12,
      parentUid: cap1,
      order: 1,
      name: 'Replanteo altimétrico y planimétrico',
      unit: 'gl',
      quantity: 1,
      durationDays: 2,
      startDate: start,
      colorKey: 'preliminares',
      predecessors: [{ taskUid: t11, type: 'FS', lagDays: 0 }],
    }),
    makeTaskDefaults({ uid: cap2, order: 1, name: 'MOVIMIENTO DE SUELOS', startDate: start }),
    makeTaskDefaults({
      uid: t21,
      parentUid: cap2,
      order: 0,
      name: 'Excavación masiva',
      unit: 'm³',
      quantity: 12500,
      durationDays: 12,
      startDate: start,
      colorKey: 'movimiento-suelos',
      predecessors: [{ taskUid: cap1, type: 'FS', lagDays: 0 }],
    }),
    makeTaskDefaults({
      uid: t22,
      parentUid: cap2,
      order: 1,
      name: 'Relleno y compactación',
      unit: 'm³',
      quantity: 9800,
      durationDays: 9,
      startDate: start,
      colorKey: 'movimiento-suelos',
      predecessors: [{ taskUid: t21, type: 'FS', lagDays: 0 }],
    }),
    makeTaskDefaults({
      uid: hito,
      order: 2,
      name: 'Fin de movimiento de suelos',
      durationDays: 0,
      startDate: start,
      predecessors: [{ taskUid: t22, type: 'FS', lagDays: 0 }],
    }),
  ];
}

interface ProjectState {
  meta: ProjectMeta;
  calendar: CalendarConfig;
  palette: RubroPaletteEntry[];
  tasks: Task[];
  scheduleIssue: string | null;
  showCriticalPath: boolean;

  addTask: (afterUid: string | null, opts?: { asChild?: boolean }) => string;
  removeTask: (uid: string) => void;
  updateTask: (
    uid: string,
    patch: Partial<Pick<Task, 'name' | 'quantity' | 'unit' | 'durationDays' | 'percentComplete' | 'colorKey'>>,
  ) => void;
  setManualStart: (uid: string, manualStart: boolean, startDate?: string) => void;
  setPredecessors: (uid: string, predecessors: Predecessor[]) => void;
  indent: (uid: string) => void;
  outdent: (uid: string) => void;
  moveUp: (uid: string) => void;
  moveDown: (uid: string) => void;
  duplicateTask: (uid: string) => void;
  setCalendar: (calendar: CalendarConfig) => void;
  setMeta: (meta: Partial<ProjectMeta>) => void;
  setPalette: (palette: RubroPaletteEntry[]) => void;
  toggleCriticalPath: () => void;
  loadProject: (project: ProjectFile) => void;
  resetProject: () => void;
  exportProject: () => ProjectFile;
}

function recompute(tasks: Task[], calendar: CalendarConfig): { tasks: Task[]; issue: string | null } {
  const reindexed = reindexHierarchy(tasks);
  const { tasks: scheduled, issue } = resolveSchedule(reindexed, calendar);
  if (issue) return { tasks: scheduled, issue: issue.message };
  const { tasks: withCpm } = computeCriticalPath(scheduled, calendar);
  return { tasks: withCpm, issue: null };
}

function initialProject(): { meta: ProjectMeta; calendar: CalendarConfig; palette: RubroPaletteEntry[]; tasks: Task[] } {
  const saved = loadFromLocalStorage();
  if (saved) {
    return { meta: saved.meta, calendar: saved.calendar, palette: saved.palette, tasks: saved.tasks };
  }
  return { meta: DEFAULT_META, calendar: DEFAULT_CALENDAR, palette: DEFAULT_PALETTE, tasks: seedTasks() };
}

export const useProjectStore = create<ProjectState>((set, get) => {
  const initial = initialProject();
  const { tasks: initialTasks, issue: initialIssue } = recompute(initial.tasks, initial.calendar);

  function commit(next: Partial<Pick<ProjectState, 'tasks' | 'calendar' | 'meta' | 'palette'>>) {
    const state = get();
    const calendar = next.calendar ?? state.calendar;
    const rawTasks = next.tasks ?? state.tasks;
    const { tasks, issue } = recompute(rawTasks, calendar);
    const meta = next.meta ?? state.meta;
    const palette = next.palette ?? state.palette;
    set({ tasks, calendar, meta, palette, scheduleIssue: issue });
    saveToLocalStorage({ schemaVersion: SCHEMA_VERSION, meta, calendar, palette, tasks });
  }

  return {
    meta: initial.meta,
    calendar: initial.calendar,
    palette: initial.palette,
    tasks: initialTasks,
    scheduleIssue: initialIssue,
    showCriticalPath: false,

    addTask: (afterUid, opts) => {
      const state = get();
      const newUid = nanoid();
      let parentUid: string | null = null;
      let order = state.tasks.length;
      let colorKey: string | undefined;
      let startDate = todayISO();

      if (afterUid) {
        const afterTask = state.tasks.find((t) => t.uid === afterUid);
        if (afterTask) {
          startDate = afterTask.startDate;
          if (opts?.asChild) {
            parentUid = afterTask.uid;
            order = childrenOf(state.tasks, afterTask.uid).length;
            colorKey = afterTask.colorKey;
          } else {
            parentUid = afterTask.parentUid;
            order = afterTask.order + 0.5;
            colorKey = parentUid ? state.tasks.find((t) => t.uid === parentUid)?.colorKey : undefined;
          }
        }
      }

      const newTask = makeTaskDefaults({ uid: newUid, parentUid, order, startDate, colorKey });
      commit({ tasks: [...state.tasks, newTask] });
      return newUid;
    },

    removeTask: (uid) => {
      const state = get();
      const toRemove = new Set([uid, ...descendantsOf(state.tasks, uid).map((t) => t.uid)]);
      const tasks = state.tasks
        .filter((t) => !toRemove.has(t.uid))
        .map((t) => ({ ...t, predecessors: t.predecessors.filter((p) => !toRemove.has(p.taskUid)) }));
      commit({ tasks });
    },

    updateTask: (uid, patch) => {
      const state = get();
      const tasks = state.tasks.map((t) => (t.uid === uid ? { ...t, ...patch } : t));
      commit({ tasks });
    },

    setManualStart: (uid, manualStart, startDate) => {
      const state = get();
      const tasks = state.tasks.map((t) =>
        t.uid === uid ? { ...t, manualStart, ...(startDate ? { startDate } : {}) } : t,
      );
      commit({ tasks });
    },

    setPredecessors: (uid, predecessors) => {
      const state = get();
      const tasks = state.tasks.map((t) => (t.uid === uid ? { ...t, predecessors } : t));
      commit({ tasks });
    },

    indent: (uid) => {
      const state = get();
      const task = state.tasks.find((t) => t.uid === uid);
      if (!task) return;
      const siblings = state.tasks.filter((t) => t.parentUid === task.parentUid).sort((a, b) => a.order - b.order);
      const idx = siblings.findIndex((t) => t.uid === uid);
      if (idx <= 0) return; // no previous sibling to become the parent
      const newParent = siblings[idx - 1];
      const newOrder = childrenOf(state.tasks, newParent.uid).length;
      const tasks = state.tasks.map((t) =>
        t.uid === uid ? { ...t, parentUid: newParent.uid, order: newOrder, colorKey: t.colorKey ?? newParent.colorKey } : t,
      );
      commit({ tasks });
    },

    outdent: (uid) => {
      const state = get();
      const task = state.tasks.find((t) => t.uid === uid);
      if (!task || !task.parentUid) return;
      const parent = state.tasks.find((t) => t.uid === task.parentUid);
      if (!parent) return;
      const tasks = state.tasks.map((t) =>
        t.uid === uid ? { ...t, parentUid: parent.parentUid, order: parent.order + 0.5 } : t,
      );
      commit({ tasks });
    },

    moveUp: (uid) => {
      const state = get();
      const task = state.tasks.find((t) => t.uid === uid);
      if (!task) return;
      const siblings = state.tasks.filter((t) => t.parentUid === task.parentUid).sort((a, b) => a.order - b.order);
      const idx = siblings.findIndex((t) => t.uid === uid);
      if (idx <= 0) return;
      const prev = siblings[idx - 1];
      const tasks = state.tasks.map((t) => {
        if (t.uid === task.uid) return { ...t, order: prev.order };
        if (t.uid === prev.uid) return { ...t, order: task.order };
        return t;
      });
      commit({ tasks });
    },

    moveDown: (uid) => {
      const state = get();
      const task = state.tasks.find((t) => t.uid === uid);
      if (!task) return;
      const siblings = state.tasks.filter((t) => t.parentUid === task.parentUid).sort((a, b) => a.order - b.order);
      const idx = siblings.findIndex((t) => t.uid === uid);
      if (idx === -1 || idx >= siblings.length - 1) return;
      const next = siblings[idx + 1];
      const tasks = state.tasks.map((t) => {
        if (t.uid === task.uid) return { ...t, order: next.order };
        if (t.uid === next.uid) return { ...t, order: task.order };
        return t;
      });
      commit({ tasks });
    },

    duplicateTask: (uid) => {
      const state = get();
      const original = state.tasks.find((t) => t.uid === uid);
      if (!original) return;
      const subtree = [original, ...descendantsOf(state.tasks, uid)];
      const uidMap = new Map(subtree.map((t) => [t.uid, nanoid()]));

      const clones = subtree.map((t) => {
        const newUid = uidMap.get(t.uid)!;
        const isRoot = t.uid === original.uid;
        return {
          ...t,
          uid: newUid,
          name: isRoot ? `${t.name} (copia)` : t.name,
          parentUid: isRoot ? t.parentUid : (uidMap.get(t.parentUid as string) ?? t.parentUid),
          order: isRoot ? t.order + 0.5 : t.order,
          predecessors: t.predecessors.map((p) => ({
            ...p,
            taskUid: uidMap.get(p.taskUid) ?? p.taskUid,
          })),
        };
      });

      commit({ tasks: [...state.tasks, ...clones] });
    },

    setCalendar: (calendar) => commit({ calendar }),
    setMeta: (meta) => commit({ meta: { ...get().meta, ...meta } }),
    setPalette: (palette) => commit({ palette }),
    toggleCriticalPath: () => set((s) => ({ showCriticalPath: !s.showCriticalPath })),

    loadProject: (project) => {
      commit({ tasks: project.tasks, calendar: project.calendar, meta: project.meta, palette: project.palette });
    },

    resetProject: () => {
      commit({ tasks: seedTasks(), calendar: DEFAULT_CALENDAR, meta: DEFAULT_META, palette: DEFAULT_PALETTE });
    },

    exportProject: () => {
      const state = get();
      return { schemaVersion: SCHEMA_VERSION, meta: state.meta, calendar: state.calendar, palette: state.palette, tasks: state.tasks };
    },
  };
});
