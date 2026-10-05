import { addDays, format, getISODay, getISOWeek } from 'date-fns';
import { formatISODate, parseISODate, spanDays } from '../engine/dateMath';
import { depthOf, isMilestoneTask, isSummaryTask } from '../engine/hierarchy';
import type { ProjectSummary } from '../engine/projectSummary';
import type { CalendarConfig, ProjectMeta, RubroPaletteEntry } from '../types/project';
import type { LinkType, Task } from '../types/task';
import { daysBetween } from '../components/gantt/ganttLayout';
import { dependencyPath, type RouteBar } from '../components/gantt/dependencyRoute';
import {
  FOOTER_HEIGHT_MM,
  GUTTER_MM,
  HEADER_HEIGHT_MM,
  MARGIN_MM,
  TABLE_HEADER_HEIGHT_MM,
  TABLE_WIDTH_MM,
  type TableColumn,
  type TimeScaleUnit,
} from './exportLayout';
import { PRINT_COLORS } from './printColors';
import { SVG_NS, fitFontSize, svgEl, textEl } from './svgBuilders';
import type { TimeColumn } from './timeColumns';

export interface BuildPageOptions {
  pageWidthMm: number;
  pageHeightMm: number;
  tasks: Task[];
  calendar: CalendarConfig;
  palette: RubroPaletteEntry[];
  meta: ProjectMeta;
  summary: ProjectSummary;
  tileIndex: number;
  tileCount: number;
  tileStartISO: string;
  tileEndISO: string;
  /** Columnas de tiempo (días / semanas / meses) que entran en esta hoja. */
  tileColumns: TimeColumn[];
  timeScale: TimeScaleUnit;
  ganttAreaWidthMm: number;
  mmPerDay: number;
  showCriticalPath: boolean;
  tableColumns: TableColumn[];
  /** Ancho / alto del logo (se asume cuadrado si todavía no se conoce). */
  logoAspect?: number;
}

type BarLayout = RouteBar;

export function buildPageSvg(opts: BuildPageOptions): SVGSVGElement {
  const {
    pageWidthMm,
    pageHeightMm,
    tasks,
    calendar,
    palette,
    meta,
    summary,
    tileIndex,
    tileCount,
    tileStartISO,
    tileEndISO,
    tileColumns,
    timeScale,
    ganttAreaWidthMm,
    mmPerDay,
    showCriticalPath,
    tableColumns,
    logoAspect,
  } = opts;

  const colorByKey = new Map(palette.map((p) => [p.key, p.color]));
  const bodyTop = MARGIN_MM + HEADER_HEIGHT_MM + GUTTER_MM;
  const bodyBottom = pageHeightMm - MARGIN_MM - FOOTER_HEIGHT_MM - GUTTER_MM;
  const headerRowY = bodyTop;
  const rowsTop = bodyTop + TABLE_HEADER_HEIGHT_MM;
  const availableRowsHeight = Math.max(bodyBottom - rowsTop, 0);
  const rowHeightMm = tasks.length > 0 ? Math.min(6, Math.max(3, availableRowsHeight / tasks.length)) : 6;
  const ganttX = MARGIN_MM + TABLE_WIDTH_MM + GUTTER_MM;

  const svg = svgEl('svg', {
    xmlns: SVG_NS,
    width: `${pageWidthMm}mm`,
    height: `${pageHeightMm}mm`,
    viewBox: `0 0 ${pageWidthMm} ${pageHeightMm}`,
  });

  svg.appendChild(svgEl('rect', { x: 0, y: 0, width: pageWidthMm, height: pageHeightMm, fill: PRINT_COLORS.paper }));

  const clipId = `gantt-clip-${tileIndex}`;
  const headClipId = `gantt-head-clip-${tileIndex}`;
  svg.appendChild(
    svgEl('defs', {}, [
      svgEl('clipPath', { id: clipId }, [
        svgEl('rect', { x: ganttX, y: rowsTop, width: ganttAreaWidthMm, height: availableRowsHeight }),
      ]),
      svgEl('clipPath', { id: headClipId }, [
        svgEl('rect', { x: ganttX, y: headerRowY, width: ganttAreaWidthMm, height: TABLE_HEADER_HEIGHT_MM }),
      ]),
      ...columnClipPaths(tableColumns, tileIndex, rowsTop, availableRowsHeight),
      arrowMarker('export-arrow', PRINT_COLORS.ink500),
      arrowMarker('export-arrow-critical', PRINT_COLORS.accentCritical),
    ]),
  );

  svg.appendChild(headerGroup(meta, summary, calendar, pageWidthMm, logoAspect && logoAspect > 0 ? logoAspect : 1));
  svg.appendChild(tableHeaderRow(headerRowY, tableColumns));
  svg.appendChild(
    timeScaleGroup(ganttX, headerRowY, ganttAreaWidthMm, TABLE_HEADER_HEIGHT_MM, tileColumns, timeScale, mmPerDay, headClipId),
  );

  if (timeScale === 'day') {
    if (!calendar.workOnWeekends) {
      svg.appendChild(
        weekendBandsGroup(ganttX, rowsTop, availableRowsHeight, tileStartISO, tileEndISO, mmPerDay, clipId),
      );
    }
  } else {
    // En semanas / meses una banda de fin de semana sería una línea imperceptible: se marcan los límites de columna.
    svg.appendChild(columnGridGroup(ganttX, rowsTop, availableRowsHeight, tileColumns, mmPerDay, clipId));
  }

  const layout = new Map<string, BarLayout>();
  tasks.forEach((t, i) => {
    const milestone = isMilestoneTask(tasks, t);
    layout.set(t.uid, {
      x: ganttX + daysBetween(tileStartISO, t.startDate) * mmPerDay,
      width: Math.max((daysBetween(t.startDate, t.endDate) + 1) * mmPerDay, 1),
      y: rowsTop + i * rowHeightMm,
      // Mismas proporciones que taskBarMark() (barra) y milestoneMark() (rombo), para que la flecha toque el dibujo.
      halfHeight: milestone ? (rowHeightMm * 0.5 * Math.SQRT2) / 2 : rowHeightMm * 0.32,
      diamond: milestone,
    });
  });

  const rowsGroup = svgEl('g');
  tasks.forEach((task, i) => {
    const y = rowsTop + i * rowHeightMm;
    const summaryRow = isSummaryTask(tasks, task.uid);
    const milestone = isMilestoneTask(tasks, task);
    const depth = depthOf(tasks, task);

    if (summaryRow) {
      rowsGroup.appendChild(
        svgEl('rect', { x: MARGIN_MM, y, width: pageWidthMm - MARGIN_MM * 2, height: rowHeightMm, fill: PRINT_COLORS.ink100 }),
      );
    }
    rowsGroup.appendChild(
      svgEl('line', {
        x1: MARGIN_MM,
        y1: y + rowHeightMm,
        x2: pageWidthMm - MARGIN_MM,
        y2: y + rowHeightMm,
        stroke: PRINT_COLORS.line,
        'stroke-width': 0.15,
      }),
    );
    rowsGroup.appendChild(tableRowCells(task, calendar, y, rowHeightMm, summaryRow, milestone, depth, tableColumns, tileIndex));

    const pos = layout.get(task.uid)!;
    const barGroup = svgEl('g', { 'clip-path': `url(#${clipId})` });
    const critical = showCriticalPath && Boolean(task.isCritical);
    if (milestone) {
      barGroup.appendChild(milestoneMark(pos.x, y, rowHeightMm, critical, task.name, ganttX + ganttAreaWidthMm));
    } else if (summaryRow) {
      barGroup.appendChild(summaryBarMark(pos.x, y, pos.width, rowHeightMm));
    } else {
      const color = task.colorKey ? colorByKey.get(task.colorKey) : undefined;
      barGroup.appendChild(taskBarMark(pos.x, y, pos.width, rowHeightMm, color, task.percentComplete, critical));
    }
    rowsGroup.appendChild(barGroup);
  });

  const arrowsGroup = svgEl('g', { 'clip-path': `url(#${clipId})` });
  const byUid = new Map(tasks.map((t) => [t.uid, t]));
  tasks.forEach((task) => {
    const succPos = layout.get(task.uid);
    if (!succPos) return;
    // Los capítulos derivan sus fechas de sus hijos: sus propias predecesoras no afectan el
    // cálculo, así que tampoco deben dibujarse (evita flechas "fantasma" sin efecto real).
    if (isSummaryTask(tasks, task.uid)) return;
    task.predecessors.forEach((pred) => {
      const predTask = byUid.get(pred.taskUid);
      const predPos = layout.get(pred.taskUid);
      if (!predTask || !predPos) return;
      const critical = showCriticalPath && Boolean(task.isCritical) && Boolean(predTask.isCritical);
      arrowsGroup.appendChild(arrowPath(pred.type, predPos, succPos, rowHeightMm, critical));
    });
  });
  rowsGroup.appendChild(arrowsGroup);

  svg.appendChild(rowsGroup);
  svg.appendChild(footerGroup(meta, pageWidthMm, pageHeightMm, tileIndex, tileCount));

  return svg;
}

function arrowMarker(id: string, color: string) {
  return svgEl('marker', { id, markerWidth: 6, markerHeight: 6, refX: 4.5, refY: 2.25, orient: 'auto' }, [
    svgEl('path', { d: 'M0,0 L4.5,2.25 L0,4.5 Z', fill: color }),
  ]);
}

const LOGO_MAX_HEIGHT_MM = 16;
const LOGO_MAX_WIDTH_MM = 40;
const LOGO_GAP_MM = 5;

function headerGroup(
  meta: ProjectMeta,
  summary: ProjectSummary,
  calendar: CalendarConfig,
  pageWidthMm: number,
  logoAspect: number,
) {
  const g = svgEl('g');

  // Logo del proyecto en la esquina superior izquierda; el texto del encabezado se corre a su derecha.
  let textX = MARGIN_MM;
  if (meta.logoDataUrl) {
    const logoWidth = Math.min(LOGO_MAX_HEIGHT_MM * logoAspect, LOGO_MAX_WIDTH_MM);
    const logoHeight = logoWidth / logoAspect;
    g.appendChild(
      svgEl('image', {
        href: meta.logoDataUrl,
        'xlink:href': meta.logoDataUrl,
        x: MARGIN_MM,
        y: MARGIN_MM + 1 + (LOGO_MAX_HEIGHT_MM - logoHeight) / 2,
        width: logoWidth,
        height: logoHeight,
        preserveAspectRatio: 'xMinYMid meet',
      }),
    );
    textX = MARGIN_MM + logoWidth + LOGO_GAP_MM;
  }

  // El bloque de plazo ocupa la derecha (~100 mm): el título se achica si el logo le quita lugar.
  const title = meta.title || 'Cronograma de obra';
  const titleFontSize = fitFontSize(title, pageWidthMm - MARGIN_MM - textX - 100, 6.5, 0.6);
  g.appendChild(textEl(textX, MARGIN_MM + 6, title, {
    'font-size': titleFontSize,
    'font-weight': 700,
    fill: PRINT_COLORS.ink900,
    'font-family': 'Arial, sans-serif',
  }));
  const subtitle = [meta.client, meta.location].filter(Boolean).join('  ·  ');
  if (subtitle) {
    g.appendChild(
      textEl(textX, MARGIN_MM + 12, subtitle, {
        'font-size': 3.4,
        fill: PRINT_COLORS.ink500,
        'font-family': 'Arial, sans-serif',
      }),
    );
  }

  const plazoLabel = summary.startDate
    ? calendar.workOnWeekends
      ? `${summary.totalCalendarDays} días corridos`
      : `${summary.totalWorkDays} días hábiles (${summary.totalCalendarDays} corridos)`
    : '—';

  g.appendChild(
    textEl(pageWidthMm - MARGIN_MM, MARGIN_MM + 6, `Plazo total: ${plazoLabel}`, {
      'font-size': 3.8,
      'font-weight': 700,
      fill: PRINT_COLORS.ink900,
      'text-anchor': 'end',
      'font-family': 'Arial, sans-serif',
    }),
  );
  if (summary.startDate) {
    g.appendChild(
      textEl(pageWidthMm - MARGIN_MM, MARGIN_MM + 11, `${summary.startDate} al ${summary.endDate}`, {
        'font-size': 3.2,
        fill: PRINT_COLORS.ink500,
        'text-anchor': 'end',
        'font-family': 'Arial, sans-serif',
      }),
    );
  }

  g.appendChild(
    svgEl('line', {
      x1: MARGIN_MM,
      y1: MARGIN_MM + HEADER_HEIGHT_MM,
      x2: pageWidthMm - MARGIN_MM,
      y2: MARGIN_MM + HEADER_HEIGHT_MM,
      stroke: PRINT_COLORS.ink900,
      'stroke-width': 0.5,
    }),
  );
  return g;
}

/** Un clipPath por columna (reusado en todas las filas) para que el texto se corte exactamente
 * en el borde real de la columna, sin depender de una estimación de ancho de caracteres. */
function columnClipPaths(columns: TableColumn[], tileIndex: number, rowsTop: number, availableRowsHeight: number) {
  let x = MARGIN_MM;
  return columns.map((col) => {
    const clip = svgEl('clipPath', { id: columnClipId(col.key, tileIndex) }, [
      svgEl('rect', { x, y: rowsTop, width: Math.max(col.width - 1, 1), height: availableRowsHeight }),
    ]);
    x += col.width;
    return clip;
  });
}

function columnClipId(key: string, tileIndex: number): string {
  return `col-clip-${key}-${tileIndex}`;
}

function tableHeaderRow(y: number, columns: TableColumn[]) {
  const g = svgEl('g');
  let x = MARGIN_MM;
  for (const col of columns) {
    g.appendChild(
      textEl(x + 1, y + 4.5, col.label, {
        'font-size': 3,
        'font-weight': 700,
        fill: PRINT_COLORS.ink700,
        'font-family': 'Arial, sans-serif',
      }),
    );
    x += col.width;
  }
  g.appendChild(
    svgEl('line', { x1: MARGIN_MM, y1: y + TABLE_HEADER_HEIGHT_MM, x2: x, y2: y + TABLE_HEADER_HEIGHT_MM, stroke: PRINT_COLORS.lineStrong, 'stroke-width': 0.3 }),
  );
  return g;
}

function tableRowCells(
  task: Task,
  calendar: CalendarConfig,
  y: number,
  rowHeight: number,
  summaryRow: boolean,
  milestone: boolean,
  depth: number,
  columns: TableColumn[],
  tileIndex: number,
) {
  const g = svgEl('g');
  const fontSize = Math.min(3.2, rowHeight * 0.55);
  const textY = y + rowHeight / 2 + fontSize * 0.35;
  let x = MARGIN_MM;

  const values: Record<string, string> = {
    id: task.id,
    name: task.name,
    qty: task.quantity !== undefined ? task.quantity.toLocaleString('es-AR') : '',
    unit: task.unit ?? '',
    dur: (summaryRow ? spanDays(task.startDate, task.endDate, calendar) : task.durationDays).toLocaleString('es-AR'),
    start: format(parseISODate(task.startDate), 'dd/MM/yy'),
    end: format(parseISODate(task.endDate), 'dd/MM/yy'),
  };

  for (const col of columns) {
    const isNameCol = col.key === 'name';
    const indent = isNameCol ? depth * 2.5 : 0;
    const milestoneMarkWidth = isNameCol && milestone ? 3 : 0;
    const raw = values[col.key] ?? '';
    const cellGroup = svgEl('g', { 'clip-path': `url(#${columnClipId(col.key, tileIndex)})` });
    if (isNameCol && milestone) {
      const dotSize = fontSize * 0.6;
      const cx = x + 1 + indent + dotSize / 2;
      cellGroup.appendChild(
        svgEl('rect', {
          x: cx - dotSize / 2,
          y: textY - dotSize * 0.9,
          width: dotSize,
          height: dotSize,
          fill: PRINT_COLORS.ink900,
          transform: `rotate(45 ${cx} ${textY - dotSize * 0.4})`,
        }),
      );
    }
    const cellFontSize = fitFontSize(raw, col.width - indent - milestoneMarkWidth - 1, fontSize);
    cellGroup.appendChild(
      textEl(x + 1 + indent + milestoneMarkWidth, textY, raw, {
        'font-size': cellFontSize,
        'font-weight': summaryRow && isNameCol ? 700 : 400,
        fill: PRINT_COLORS.ink900,
        'font-family': 'Arial, sans-serif',
      }),
    );
    g.appendChild(cellGroup);
    x += col.width;
  }
  return g;
}

/** Franjas del encabezado superior (meses, o años cuando las columnas ya son meses), con x relativo al inicio de la hoja. */
function periodBands(startISO: string, endISO: string, mmPerDay: number, period: 'month' | 'year') {
  const bands: { label: string; shortLabel: string; x: number; width: number }[] = [];
  const start = parseISODate(startISO);
  const end = parseISODate(endISO);
  let cursor = start;
  while (cursor <= end) {
    const periodStart = period === 'month' ? new Date(cursor.getFullYear(), cursor.getMonth(), 1) : new Date(cursor.getFullYear(), 0, 1);
    const periodEnd = period === 'month' ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0) : new Date(cursor.getFullYear(), 11, 31);
    const visibleStart = periodStart < start ? start : periodStart;
    const visibleEnd = periodEnd > end ? end : periodEnd;
    const widthDays = Math.round((visibleEnd.getTime() - visibleStart.getTime()) / 86400000) + 1;
    bands.push({
      label: format(periodStart, period === 'month' ? 'MMM yyyy' : 'yyyy'),
      shortLabel: period === 'month' ? format(periodStart, 'MMM') : '',
      x: daysBetween(startISO, formatISODate(visibleStart)) * mmPerDay,
      width: widthDays * mmPerDay,
    });
    cursor = period === 'month' ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1) : new Date(cursor.getFullYear() + 1, 0, 1);
  }
  return bands;
}

function timeScaleGroup(
  originX: number,
  y: number,
  widthMm: number,
  heightMm: number,
  columns: TimeColumn[],
  unit: TimeScaleUnit,
  mmPerDay: number,
  clipId: string,
) {
  const g = svgEl('g');
  g.appendChild(svgEl('rect', { x: originX, y, width: widthMm, height: heightMm, fill: PRINT_COLORS.surface, stroke: PRINT_COLORS.line, 'stroke-width': 0.2 }));

  const labels = svgEl('g', { 'clip-path': `url(#${clipId})` });
  g.appendChild(labels);

  const tileStartISO = columns[0].startISO;
  const tileEndISO = formatISODate(addDays(parseISODate(columns[columns.length - 1].endISO), -1));

  // Franja superior: meses (días / semanas) o años (meses).
  for (const band of periodBands(tileStartISO, tileEndISO, mmPerDay, unit === 'month' ? 'year' : 'month')) {
    const bandX = originX + band.x;
    if (band.x > 0) labels.appendChild(svgEl('line', { x1: bandX, y1: y, x2: bandX, y2: y + 3.8, stroke: PRINT_COLORS.line, 'stroke-width': 0.15 }));
    // Un mes que apenas asoma en el borde de la hoja no tiene lugar para su rótulo: se acorta o se omite
    // para que no se pise con el del mes siguiente.
    const estimatedWidth = (text: string) => text.length * 2.6 * 0.6;
    const label = band.width - 1 >= estimatedWidth(band.label) ? band.label : band.width - 1 >= estimatedWidth(band.shortLabel) ? band.shortLabel : '';
    if (!label) continue;
    labels.appendChild(
      textEl(bandX + 1, y + 3.5, label, {
        'font-size': 2.6,
        'font-weight': 700,
        fill: PRINT_COLORS.ink700,
        'font-family': 'Arial, sans-serif',
      }),
    );
  }

  // Fila inferior: una etiqueta por columna.
  const labelY = y + heightMm - 1;
  for (const col of columns) {
    const start = parseISODate(col.startISO);
    const x = originX + daysBetween(tileStartISO, col.startISO) * mmPerDay;
    const colWidth = col.days * mmPerDay;

    if (unit === 'day') {
      // Una marca por lunes para separar semanas; el número del día va centrado en su columna.
      if (getISODay(start) === 1) labels.appendChild(svgEl('line', { x1: x, y1: y + 3.8, x2: x, y2: y + heightMm, stroke: PRINT_COLORS.line, 'stroke-width': 0.15 }));
      labels.appendChild(
        textEl(x + colWidth / 2, labelY, format(start, 'd'), {
          'font-size': 2,
          'text-anchor': 'middle',
          fill: PRINT_COLORS.ink500,
          'font-family': 'Arial, sans-serif',
        }),
      );
      continue;
    }

    labels.appendChild(svgEl('line', { x1: x, y1: y + 3.8, x2: x, y2: y + heightMm, stroke: PRINT_COLORS.line, 'stroke-width': 0.15 }));
    labels.appendChild(
      textEl(x + 0.7, labelY, unit === 'week' ? `S${getISOWeek(start)}` : format(start, 'MMM'), {
        'font-size': unit === 'week' ? 2 : 2.4,
        fill: PRINT_COLORS.ink500,
        'font-family': 'Arial, sans-serif',
      }),
    );
  }
  return g;
}

/** Líneas verticales tenues en cada límite de columna (semanas / meses). */
function columnGridGroup(originX: number, y: number, heightMm: number, columns: TimeColumn[], mmPerDay: number, clipId: string) {
  const g = svgEl('g', { 'clip-path': `url(#${clipId})` });
  const tileStartISO = columns[0].startISO;
  for (const col of columns) {
    const x = originX + daysBetween(tileStartISO, col.startISO) * mmPerDay;
    g.appendChild(svgEl('line', { x1: x, y1: y, x2: x, y2: y + heightMm, stroke: PRINT_COLORS.line, 'stroke-width': 0.12 }));
  }
  return g;
}

function weekendBandsGroup(originX: number, y: number, heightMm: number, startISO: string, endISO: string, mmPerDay: number, clipId: string) {
  const g = svgEl('g', { 'clip-path': `url(#${clipId})` });
  let cursor = parseISODate(startISO);
  const end = parseISODate(endISO);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day === 0 || day === 6) {
      const x = originX + daysBetween(startISO, formatISODate(cursor)) * mmPerDay;
      g.appendChild(svgEl('rect', { x, y, width: mmPerDay, height: heightMm, fill: PRINT_COLORS.gridWeekend }));
    }
    cursor = addDays(cursor, 1);
  }
  return g;
}

function taskBarMark(x: number, y: number, width: number, rowHeight: number, color: string | undefined, percent: number, critical: boolean) {
  const inset = rowHeight * 0.18;
  const barHeight = rowHeight - inset * 2;
  const fill = color ?? PRINT_COLORS.ink300;
  const g = svgEl('g');
  g.appendChild(
    svgEl('rect', {
      x,
      y: y + inset,
      width,
      height: barHeight,
      rx: barHeight * 0.3,
      fill,
      'fill-opacity': 0.5,
      stroke: critical ? PRINT_COLORS.accentCritical : PRINT_COLORS.ink700,
      'stroke-width': critical ? 0.6 : 0.2,
    }),
  );
  const progressWidth = (Math.min(100, Math.max(0, percent)) / 100) * width;
  if (progressWidth > 0) {
    g.appendChild(svgEl('rect', { x, y: y + inset, width: progressWidth, height: barHeight, rx: barHeight * 0.3, fill }));
  }
  return g;
}

function summaryBarMark(x: number, y: number, width: number, rowHeight: number) {
  const top = y + rowHeight * 0.25;
  const thickness = rowHeight * 0.22;
  const capH = rowHeight * 0.3;
  const capW = rowHeight * 0.22;
  const g = svgEl('g');
  g.appendChild(svgEl('rect', { x, y: top, width, height: thickness, fill: PRINT_COLORS.ink900 }));
  g.appendChild(svgEl('polygon', { points: `${x},${top + thickness} ${x + capW},${top + thickness} ${x},${top + thickness + capH}`, fill: PRINT_COLORS.ink900 }));
  g.appendChild(
    svgEl('polygon', {
      points: `${x + width},${top + thickness} ${x + width - capW},${top + thickness} ${x + width},${top + thickness + capH}`,
      fill: PRINT_COLORS.ink900,
    }),
  );
  return g;
}

function milestoneMark(x: number, y: number, rowHeight: number, critical: boolean, label: string, rightEdgeX: number) {
  const size = rowHeight * 0.5;
  const cy = y + rowHeight / 2;
  const g = svgEl('g');
  g.appendChild(
    svgEl('rect', {
      x: x - size / 2,
      y: cy - size / 2,
      width: size,
      height: size,
      fill: critical ? PRINT_COLORS.accentCritical : PRINT_COLORS.ink900,
      transform: `rotate(45 ${x} ${cy})`,
    }),
  );
  // Si el rótulo no entra a la derecha del rombo (hito cerca del borde de la hoja), va a su izquierda.
  const estimatedLabelWidth = label.length * 3 * 0.55;
  const fitsRight = x + size + estimatedLabelWidth <= rightEdgeX;
  g.appendChild(
    textEl(fitsRight ? x + size : x - size, cy + 1, label, {
      'font-size': 3,
      'text-anchor': fitsRight ? 'start' : 'end',
      fill: PRINT_COLORS.ink900,
      'font-family': 'Arial, sans-serif',
    }),
  );
  return g;
}

const STUB_MM = 3;

function arrowPath(type: LinkType, predPos: BarLayout, succPos: BarLayout, rowHeight: number, critical: boolean) {
  return svgEl('path', {
    d: dependencyPath(type, predPos, succPos, rowHeight, STUB_MM),
    fill: 'none',
    stroke: critical ? PRINT_COLORS.accentCritical : PRINT_COLORS.ink500,
    'stroke-width': critical ? 0.5 : 0.25,
    'marker-end': critical ? 'url(#export-arrow-critical)' : 'url(#export-arrow)',
  });
}

function footerGroup(meta: ProjectMeta, pageWidthMm: number, pageHeightMm: number, tileIndex: number, tileCount: number) {
  const y = pageHeightMm - MARGIN_MM;
  const g = svgEl('g');
  g.appendChild(svgEl('line', { x1: MARGIN_MM, y1: y - FOOTER_HEIGHT_MM + 3, x2: pageWidthMm - MARGIN_MM, y2: y - FOOTER_HEIGHT_MM + 3, stroke: PRINT_COLORS.line, 'stroke-width': 0.2 }));
  g.appendChild(
    textEl(MARGIN_MM, y, meta.title || 'Cronograma de obra', { 'font-size': 2.8, fill: PRINT_COLORS.ink500, 'font-family': 'Arial, sans-serif' }),
  );
  g.appendChild(
    textEl(pageWidthMm / 2, y, `Hoja ${tileIndex + 1} de ${tileCount}`, {
      'font-size': 2.8,
      fill: PRINT_COLORS.ink500,
      'text-anchor': 'middle',
      'font-family': 'Arial, sans-serif',
    }),
  );
  g.appendChild(
    textEl(pageWidthMm - MARGIN_MM, y, `Emitido ${format(new Date(), 'dd/MM/yyyy')}`, {
      'font-size': 2.8,
      fill: PRINT_COLORS.ink500,
      'text-anchor': 'end',
      'font-family': 'Arial, sans-serif',
    }),
  );
  return g;
}
