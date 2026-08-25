import { useRef } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { exportProjectJSON, parseProjectJSON } from '../../store/persistence';

function safeFileName(title: string): string {
  return (title || 'cronograma').trim().replace(/[^\p{L}\p{N}\-_ ]+/gu, '').replace(/\s+/g, '_') || 'cronograma';
}

export function ProjectFileControls() {
  const exportProject = useProjectStore((s) => s.exportProject);
  const loadProject = useProjectStore((s) => s.loadProject);
  const meta = useProjectStore((s) => s.meta);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    const json = exportProjectJSON(exportProject());
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFileName(meta.title)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!window.confirm('Esto reemplaza el cronograma actual por el del archivo. ¿Continuar?')) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        loadProject(parseProjectJSON(reader.result as string));
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'No se pudo abrir el archivo.');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="project-file-controls">
      <button type="button" onClick={handleSave} title="Descargar el cronograma como archivo .json">
        Guardar archivo
      </button>
      <button type="button" onClick={() => fileInputRef.current?.click()} title="Abrir un cronograma guardado (.json)">
        Abrir archivo
      </button>
      <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={handleFileChange} />
    </div>
  );
}
