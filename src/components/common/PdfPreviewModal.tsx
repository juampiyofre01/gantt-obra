import { useEffect, useMemo, useRef, useState } from 'react';
import type { Task } from '../../types/task';
import type { CalendarConfig, ProjectMeta, RubroPaletteEntry } from '../../types/project';
import type { ColumnKey } from '../../store/useColumnWidths';
import { buildExportPages, exportProjectPdf } from '../../export/exportPdf';
import type { PaperSize } from '../../export/pageSizes';

const PAPER_SIZES: PaperSize[] = ['A4', 'A3', 'A2', 'A1', 'A0'];

interface PdfPreviewModalProps {
  tasks: Task[];
  calendar: CalendarConfig;
  palette: RubroPaletteEntry[];
  meta: ProjectMeta;
  showCriticalPath: boolean;
  columnWidths: Record<ColumnKey, number>;
  initialPaperSize: PaperSize;
  onClose: () => void;
}

export function PdfPreviewModal({
  tasks,
  calendar,
  palette,
  meta,
  showCriticalPath,
  columnWidths,
  initialPaperSize,
  onClose,
}: PdfPreviewModalProps) {
  const [paperSize, setPaperSize] = useState<PaperSize>(initialPaperSize);
  const [pageIndex, setPageIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { pages } = useMemo(
    () => buildExportPages({ paperSize, tasks, calendar, palette, meta, showCriticalPath, columnWidths }),
    [paperSize, tasks, calendar, palette, meta, showCriticalPath, columnWidths],
  );

  useEffect(() => {
    setPageIndex((i) => Math.min(i, pages.length - 1));
  }, [pages.length]);

  useEffect(() => {
    const container = containerRef.current;
    const svg = pages[pageIndex];
    if (!container || !svg) return;
    svg.style.width = '100%';
    svg.style.height = 'auto';
    svg.style.display = 'block';
    container.replaceChildren(svg);
  }, [pages, pageIndex]);

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      await exportProjectPdf({ paperSize, tasks, calendar, palette, meta, showCriticalPath, columnWidths });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el PDF.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel pdf-preview-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            Vista previa
            {pages.length > 1 ? ` — hoja ${pageIndex + 1} de ${pages.length}` : ''}
          </h2>
          <button className="modal-close" onClick={onClose} type="button" title="Cerrar">
            ×
          </button>
        </div>

        <div className="pdf-preview-toolbar">
          <select
            className="export-pdf-select"
            value={paperSize}
            onChange={(e) => setPaperSize(e.target.value as PaperSize)}
            title="Tamaño de hoja"
          >
            {PAPER_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} apaisado
              </option>
            ))}
          </select>

          {pages.length > 1 && (
            <div className="pdf-preview-pager">
              <button type="button" onClick={() => setPageIndex((i) => Math.max(0, i - 1))} disabled={pageIndex === 0}>
                ‹
              </button>
              <span>
                {pageIndex + 1} / {pages.length}
              </span>
              <button
                type="button"
                onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))}
                disabled={pageIndex === pages.length - 1}
              >
                ›
              </button>
            </div>
          )}

          <div className="pdf-preview-toolbar-spacer" />
          {error && (
            <span className="export-pdf-error" title={error}>
              ⚠ {error}
            </span>
          )}
          <button type="button" onClick={handleDownload} disabled={downloading} className="pdf-preview-download">
            {downloading ? 'Generando…' : 'Descargar PDF'}
          </button>
        </div>

        <div className="pdf-preview-body">
          <div className="pdf-preview-page" ref={containerRef} />
        </div>
      </div>
    </div>
  );
}
