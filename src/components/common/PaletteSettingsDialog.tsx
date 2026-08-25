import { useState } from 'react';
import { nanoid } from 'nanoid';
import { useProjectStore } from '../../store/useProjectStore';
import { Modal } from './Modal';

export function PaletteSettingsDialog() {
  const palette = useProjectStore((s) => s.palette);
  const setPalette = useProjectStore((s) => s.setPalette);
  const [open, setOpen] = useState(false);

  function updateEntry(key: string, patch: Partial<{ label: string; color: string }>) {
    setPalette(palette.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }

  function addEntry() {
    setPalette([...palette, { key: nanoid(6), label: 'Nuevo rubro', color: '#8fa0ad' }]);
  }

  function removeEntry(key: string) {
    setPalette(palette.filter((p) => p.key !== key));
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Configurar paleta por rubro">
        Colores
      </button>
      {open && (
        <Modal title="Paleta de colores por rubro" onClose={() => setOpen(false)}>
          <table className="palette-table">
            <thead>
              <tr>
                <th />
                <th>Rubro</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {palette.map((entry) => (
                <tr key={entry.key}>
                  <td>
                    <input
                      type="color"
                      value={entry.color}
                      onChange={(e) => updateEntry(entry.key, { color: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={entry.label}
                      onChange={(e) => updateEntry(entry.key, { label: e.target.value })}
                    />
                  </td>
                  <td>
                    <button type="button" onClick={() => removeEntry(entry.key)} title="Eliminar rubro">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={addEntry}>
            + Rubro
          </button>
        </Modal>
      )}
    </>
  );
}
