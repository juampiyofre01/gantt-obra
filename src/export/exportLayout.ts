import type { ColumnKey } from '../store/useColumnWidths';

export const MARGIN_MM = 10;
export const HEADER_HEIGHT_MM = 20;
export const FOOTER_HEIGHT_MM = 9;
export const TABLE_HEADER_HEIGHT_MM = 7;
export const TIMESCALE_HEADER_HEIGHT_MM = 9;
export const GUTTER_MM = 4;

/** Unidad de las columnas del Gantt impreso: cuanto mayor la unidad, más compacto el cronograma. */
export type TimeScaleUnit = 'day' | 'week' | 'month';

export const TIME_SCALE_LABELS: Record<TimeScaleUnit, string> = {
  day: 'Días',
  week: 'Semanas',
  month: 'Meses',
};

/** mm de hoja por día calendario en cada escala (semana ≈ 9,8 mm, mes ≈ 13,7 mm). */
export const MM_PER_DAY_BY_SCALE: Record<TimeScaleUnit, number> = {
  day: 4,
  week: 1.4,
  month: 0.45,
};

/** Presupuesto fijo en mm para la tabla, independiente del ancho que el usuario le dio a cada
 * columna en pantalla — sólo las proporciones entre columnas se toman de la grilla. */
export const TABLE_WIDTH_MM = 140;

export interface TableColumn {
  key: 'id' | 'name' | 'qty' | 'unit' | 'dur' | 'start' | 'end';
  label: string;
  width: number;
}

const EXPORT_COLUMN_KEYS: Exclude<ColumnKey, 'pred'>[] = ['id', 'name', 'qty', 'unit', 'dur', 'start', 'end'];

const EXPORT_COLUMN_LABELS: Record<Exclude<ColumnKey, 'pred'>, string> = {
  id: 'Ítem',
  name: 'Descripción',
  qty: 'Cant.',
  unit: 'Un.',
  dur: 'Dur.',
  start: 'Inicio',
  end: 'Fin',
};

/** Proporciones de referencia si todavía no hay anchos guardados por el usuario — le da más
 * lugar a la descripción, que es la columna con contenido más variable en longitud. */
const FALLBACK_RATIOS: Record<Exclude<ColumnKey, 'pred'>, number> = {
  id: 9,
  name: 80,
  qty: 11,
  unit: 6,
  dur: 6,
  start: 14,
  end: 14,
};

/** Convierte los anchos de columna (px) que el usuario configuró en la grilla en pantalla a las
 * columnas de la tabla del PDF, respetando las proporciones relativas dentro de un presupuesto
 * fijo de TABLE_WIDTH_MM (así el espacio del Gantt en la hoja no cambia según cómo edite columnas). */
export function buildTableColumns(screenWidthsPx?: Partial<Record<ColumnKey, number>>): TableColumn[] {
  const ratios = EXPORT_COLUMN_KEYS.map((key) => Math.max(1, screenWidthsPx?.[key] ?? FALLBACK_RATIOS[key]));
  const totalRatio = ratios.reduce((a, b) => a + b, 0);
  return EXPORT_COLUMN_KEYS.map((key, i) => ({
    key,
    label: EXPORT_COLUMN_LABELS[key],
    width: (ratios[i] / totalRatio) * TABLE_WIDTH_MM,
  }));
}
