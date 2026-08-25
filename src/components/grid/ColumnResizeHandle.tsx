import { useRef } from 'react';
import { DEFAULT_COLUMN_WIDTHS, useColumnWidths, type ColumnKey } from '../../store/useColumnWidths';

interface ColumnResizeHandleProps {
  columnKey: ColumnKey;
}

export function ColumnResizeHandle({ columnKey }: ColumnResizeHandleProps) {
  const setWidth = useColumnWidths((s) => s.setWidth);
  const resetWidth = useColumnWidths((s) => s.resetWidth);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  function onMouseMove(e: MouseEvent) {
    if (!dragRef.current) return;
    const delta = e.clientX - dragRef.current.startX;
    setWidth(columnKey, dragRef.current.startWidth + delta);
  }

  function onMouseUp() {
    dragRef.current = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const currentWidth = useColumnWidths.getState().widths[columnKey];
    dragRef.current = { startX: e.clientX, startWidth: currentWidth };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  return (
    <span
      className="col-resize-handle"
      onMouseDown={onMouseDown}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        resetWidth(columnKey);
      }}
      title={`Arrastrá para ajustar el ancho (doble click para volver a ${DEFAULT_COLUMN_WIDTHS[columnKey]}px)`}
    />
  );
}
