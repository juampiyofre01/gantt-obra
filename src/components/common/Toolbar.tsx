import { useProjectStore } from '../../store/useProjectStore';
import type { ZoomLevel } from '../gantt/ganttLayout';
import { ExportPdfButton } from './ExportPdfButton';
import { CalendarSettingsDialog } from './CalendarSettingsDialog';
import { PaletteSettingsDialog } from './PaletteSettingsDialog';
import { ProjectFileControls } from './ProjectFileControls';

interface ToolbarProps {
  selectedUid: string | null;
  onSelect: (uid: string | null) => void;
  zoom: ZoomLevel;
  onZoomChange: (zoom: ZoomLevel) => void;
}

const ZOOM_LABELS: Record<ZoomLevel, string> = { day: 'Día', week: 'Semana', month: 'Mes' };

export function Toolbar({ selectedUid, onSelect, zoom, onZoomChange }: ToolbarProps) {
  const addTask = useProjectStore((s) => s.addTask);
  const removeTask = useProjectStore((s) => s.removeTask);
  const indent = useProjectStore((s) => s.indent);
  const outdent = useProjectStore((s) => s.outdent);
  const moveUp = useProjectStore((s) => s.moveUp);
  const moveDown = useProjectStore((s) => s.moveDown);
  const duplicateTask = useProjectStore((s) => s.duplicateTask);
  const updateTask = useProjectStore((s) => s.updateTask);
  const tasks = useProjectStore((s) => s.tasks);
  const showCriticalPath = useProjectStore((s) => s.showCriticalPath);
  const toggleCriticalPath = useProjectStore((s) => s.toggleCriticalPath);

  const selectedTask = tasks.find((t) => t.uid === selectedUid) ?? null;

  return (
    <div className="toolbar">
      <button
        type="button"
        onClick={() => onSelect(addTask(selectedUid, { asChild: false }))}
        title="Agregar tarea al mismo nivel"
      >
        + Tarea
      </button>
      <button
        type="button"
        onClick={() => onSelect(addTask(selectedUid, { asChild: true }))}
        disabled={!selectedUid}
        title="Agregar subtarea"
      >
        + Subtarea
      </button>
      <span className="toolbar-sep" />
      <button type="button" onClick={() => selectedUid && indent(selectedUid)} disabled={!selectedUid} title="Indentar">
        →
      </button>
      <button type="button" onClick={() => selectedUid && outdent(selectedUid)} disabled={!selectedUid} title="Desindentar">
        ←
      </button>
      <button type="button" onClick={() => selectedUid && moveUp(selectedUid)} disabled={!selectedUid} title="Subir">
        ↑
      </button>
      <button type="button" onClick={() => selectedUid && moveDown(selectedUid)} disabled={!selectedUid} title="Bajar">
        ↓
      </button>
      <span className="toolbar-sep" />
      <button
        type="button"
        onClick={() => selectedUid && duplicateTask(selectedUid)}
        disabled={!selectedUid}
        title="Duplicar tarea o capítulo completo"
      >
        Duplicar
      </button>
      <button
        type="button"
        onClick={() => {
          if (!selectedUid) return;
          removeTask(selectedUid);
          onSelect(null);
        }}
        disabled={!selectedUid}
        title="Eliminar"
      >
        Eliminar
      </button>
      <span className="toolbar-sep" />
      <label className="toolbar-checkbox">
        <input
          type="checkbox"
          disabled={!selectedTask}
          checked={selectedTask?.durationDays === 0}
          onChange={(e) => selectedUid && updateTask(selectedUid, { durationDays: e.target.checked ? 0 : 1 })}
        />
        Hito
      </label>
      <div className="toolbar-right-group">
        <div className="toolbar-zoom">
          {(['day', 'week', 'month'] as ZoomLevel[]).map((z) => (
            <button
              key={z}
              type="button"
              className={z === zoom ? 'toolbar-zoom-btn toolbar-zoom-btn--active' : 'toolbar-zoom-btn'}
              onClick={() => onZoomChange(z)}
            >
              {ZOOM_LABELS[z]}
            </button>
          ))}
        </div>
        <label className="toolbar-checkbox">
          <input type="checkbox" checked={showCriticalPath} onChange={toggleCriticalPath} />
          Ruta crítica
        </label>
        <span className="toolbar-sep" />
        <ProjectFileControls />
        <span className="toolbar-sep" />
        <CalendarSettingsDialog />
        <PaletteSettingsDialog />
        <span className="toolbar-sep" />
        <ExportPdfButton />
      </div>
    </div>
  );
}
