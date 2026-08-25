import jsPDF from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import type { Task } from '../types/task';
import type { CalendarConfig, ProjectMeta, RubroPaletteEntry } from '../types/project';
import type { ColumnKey } from '../store/useColumnWidths';
import { computeProjectSummary } from '../engine/projectSummary';
import { addWorkingDays } from '../engine/dateMath';
import { computeDateRange } from '../components/gantt/ganttLayout';
import { buildPageSvg } from './buildExportSvg';
import { buildTableColumns, GUTTER_MM, MARGIN_MM, MM_PER_DAY, TABLE_WIDTH_MM } from './exportLayout';
import { PAGE_SIZES_MM, type PaperSize } from './pageSizes';

const RAW_CALENDAR: CalendarConfig = { workOnWeekends: true, holidays: [] };

export interface ExportPdfOptions {
  paperSize: PaperSize;
  tasks: Task[];
  calendar: CalendarConfig;
  palette: RubroPaletteEntry[];
  meta: ProjectMeta;
  showCriticalPath: boolean;
  columnWidths: Record<ColumnKey, number>;
}

export interface ExportPages {
  pages: SVGSVGElement[];
  pageWidthMm: number;
  pageHeightMm: number;
}

/** Builds the vector SVG for every page/tile of the export — the exact same content that gets
 * embedded into the PDF, so it doubles as an accurate print preview. */
export function buildExportPages(opts: ExportPdfOptions): ExportPages {
  const { paperSize, tasks, calendar, palette, meta, showCriticalPath, columnWidths } = opts;
  const page = PAGE_SIZES_MM[paperSize];
  const range = computeDateRange(tasks);
  const summary = computeProjectSummary(tasks, calendar);
  const tableColumns = buildTableColumns(columnWidths);

  const ganttAreaWidthMm = page.width - MARGIN_MM * 2 - TABLE_WIDTH_MM - GUTTER_MM;
  const daysPerTile = Math.max(1, Math.floor(ganttAreaWidthMm / MM_PER_DAY));
  const tileCount = Math.max(1, Math.ceil(range.totalDays / daysPerTile));

  const pages: SVGSVGElement[] = [];
  for (let i = 0; i < tileCount; i += 1) {
    const tileStartISO = addWorkingDays(range.startISO, i * daysPerTile, RAW_CALENDAR);
    const tileEndISO = addWorkingDays(range.startISO, Math.min(range.totalDays, (i + 1) * daysPerTile), RAW_CALENDAR);

    pages.push(
      buildPageSvg({
        pageWidthMm: page.width,
        pageHeightMm: page.height,
        tasks,
        calendar,
        palette,
        meta,
        summary,
        tileIndex: i,
        tileCount,
        tileStartISO,
        tileEndISO,
        ganttAreaWidthMm,
        mmPerDay: MM_PER_DAY,
        showCriticalPath,
        tableColumns,
      }),
    );
  }

  return { pages, pageWidthMm: page.width, pageHeightMm: page.height };
}

export async function exportProjectPdf(opts: ExportPdfOptions): Promise<void> {
  const { pages, pageWidthMm, pageHeightMm } = buildExportPages(opts);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [pageWidthMm, pageHeightMm] });

  for (let i = 0; i < pages.length; i += 1) {
    if (i > 0) pdf.addPage([pageWidthMm, pageHeightMm], 'landscape');

    const svgEl = pages[i];
    // svg2pdf needs the element attached (styles/measurements) — keep it off-screen.
    svgEl.style.position = 'fixed';
    svgEl.style.left = '-99999px';
    svgEl.style.top = '0';
    document.body.appendChild(svgEl);
    try {
      await svg2pdf(svgEl, pdf, { x: 0, y: 0, width: pageWidthMm, height: pageHeightMm });
    } finally {
      document.body.removeChild(svgEl);
    }
  }

  const safeTitle = (opts.meta.title || 'cronograma').trim().replace(/[^\p{L}\p{N}\-_ ]+/gu, '').replace(/\s+/g, '_');
  pdf.save(`${safeTitle || 'cronograma'}_${opts.paperSize}.pdf`);
}
