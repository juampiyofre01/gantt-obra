import { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { useColumnWidths } from '../../store/useColumnWidths';
import { PdfPreviewModal } from './PdfPreviewModal';
import type { PaperSize } from '../../export/pageSizes';

const PAPER_SIZES: PaperSize[] = ['A4', 'A3', 'A2', 'A1', 'A0'];

export function ExportPdfButton() {
  const tasks = useProjectStore((s) => s.tasks);
  const calendar = useProjectStore((s) => s.calendar);
  const palette = useProjectStore((s) => s.palette);
  const meta = useProjectStore((s) => s.meta);
  const showCriticalPath = useProjectStore((s) => s.showCriticalPath);
  const columnWidths = useColumnWidths((s) => s.widths);
  const [paperSize, setPaperSize] = useState<PaperSize>('A3');
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div className="export-pdf-control">
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
      <button type="button" onClick={() => setPreviewOpen(true)}>
        Vista previa / Exportar PDF
      </button>

      {previewOpen && (
        <PdfPreviewModal
          tasks={tasks}
          calendar={calendar}
          palette={palette}
          meta={meta}
          showCriticalPath={showCriticalPath}
          columnWidths={columnWidths}
          initialPaperSize={paperSize}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}
