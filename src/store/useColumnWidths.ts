import { create } from 'zustand';

export type ColumnKey = 'id' | 'name' | 'qty' | 'unit' | 'dur' | 'start' | 'end' | 'pred';

export const COLUMN_ORDER: ColumnKey[] = ['id', 'name', 'qty', 'unit', 'dur', 'start', 'end', 'pred'];

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  id: 'Ítem',
  name: 'Descripción',
  qty: 'Cant.',
  unit: 'Un.',
  dur: 'Dur. (d)',
  start: 'Inicio',
  end: 'Fin',
  pred: 'Predecesoras',
};

export const DEFAULT_COLUMN_WIDTHS: Record<ColumnKey, number> = {
  id: 56,
  name: 260,
  qty: 64,
  unit: 52,
  dur: 64,
  start: 104,
  end: 104,
  pred: 160,
};

const MIN_WIDTHS: Record<ColumnKey, number> = {
  id: 40,
  name: 140,
  qty: 44,
  unit: 36,
  dur: 44,
  start: 84,
  end: 84,
  pred: 100,
};

const STORAGE_KEY = 'gantt-obra:column-widths';

function load(): Record<ColumnKey, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_COLUMN_WIDTHS };
    const parsed = JSON.parse(raw) as Partial<Record<ColumnKey, number>>;
    return { ...DEFAULT_COLUMN_WIDTHS, ...parsed };
  } catch {
    return { ...DEFAULT_COLUMN_WIDTHS };
  }
}

interface ColumnWidthsState {
  widths: Record<ColumnKey, number>;
  setWidth: (key: ColumnKey, px: number) => void;
  resetWidth: (key: ColumnKey) => void;
  resetAll: () => void;
}

export const useColumnWidths = create<ColumnWidthsState>((set, get) => ({
  widths: load(),
  setWidth: (key, px) => {
    const clamped = Math.max(MIN_WIDTHS[key], Math.round(px));
    const widths = { ...get().widths, [key]: clamped };
    set({ widths });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
    } catch {
      // localStorage puede fallar por cuota; el ancho igual queda aplicado en memoria.
    }
  },
  resetWidth: (key) => {
    const widths = { ...get().widths, [key]: DEFAULT_COLUMN_WIDTHS[key] };
    set({ widths });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
    } catch {
      // ignorar
    }
  },
  resetAll: () => {
    set({ widths: { ...DEFAULT_COLUMN_WIDTHS } });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignorar
    }
  },
}));
