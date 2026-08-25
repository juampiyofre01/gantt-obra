import { useState } from 'react';
import type { LinkType, Predecessor, Task } from '../../types/task';

// Códigos en español que ve el usuario. Internamente se siguen guardando como FS/SS/FF/SF.
const TYPE_TO_LABEL: Record<LinkType, string> = { FS: 'FC', SS: 'CC', FF: 'FF', SF: 'CF' };
const LABEL_TO_TYPE: Record<string, LinkType> = {
  FC: 'FS', // Fin-Comienzo (la más usada, default)
  FF: 'FF', // Fin-Fin
  CC: 'SS', // Comienzo-Comienzo
  CF: 'SF', // Comienzo-Fin
  // se acepta también la nomenclatura en inglés por si quedó guardada/tipeada así
  FS: 'FS',
  SS: 'SS',
  SF: 'SF',
};

const TOKEN_RE = /^([0-9]+(?:\.[0-9]+)*)\s*(FC|CC|CF|FF|FS|SS|SF)?\s*([+-]\d+)?$/i;

export const PREDECESSOR_LEGEND =
  'FC: Fin-Comienzo (default) · FF: Fin-Fin · CC: Comienzo-Comienzo · CF: Comienzo-Fin. ' +
  'Sumá +N o -N para atraso/adelanto en días. Ej: 1.2, 1.3CC+2';

export function formatPredecessors(predecessors: Predecessor[], idByUid: Map<string, string>): string {
  return predecessors
    .map((p) => {
      const id = idByUid.get(p.taskUid) ?? '?';
      let s = id;
      if (p.type !== 'FS') s += TYPE_TO_LABEL[p.type];
      if (p.lagDays !== 0) s += (p.lagDays > 0 ? '+' : '') + p.lagDays;
      return s;
    })
    .join(', ');
}

function parsePredecessors(text: string, uidById: Map<string, string>, ownUid: string): Predecessor[] {
  return text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((token): Predecessor | null => {
      const match = TOKEN_RE.exec(token);
      if (!match) return null;
      const [, id, typeLabel, lag] = match;
      const taskUid = uidById.get(id);
      if (!taskUid || taskUid === ownUid) return null;
      return {
        taskUid,
        type: typeLabel ? LABEL_TO_TYPE[typeLabel.toUpperCase()] : 'FS',
        lagDays: lag ? parseInt(lag, 10) : 0,
      };
    })
    .filter((p): p is Predecessor => p !== null);
}

interface PredecessorEditorProps {
  taskUid: string;
  predecessors: Predecessor[];
  tasks: Task[];
  disabled?: boolean;
  onChange: (predecessors: Predecessor[]) => void;
}

export function PredecessorEditor({ taskUid, predecessors, tasks, disabled, onChange }: PredecessorEditorProps) {
  const idByUid = new Map(tasks.map((t) => [t.uid, t.id]));
  const uidById = new Map(tasks.map((t) => [t.id, t.uid]));
  const formatted = formatPredecessors(predecessors, idByUid);
  const [draft, setDraft] = useState<string | null>(null);

  if (disabled) {
    return (
      <span
        className="grid-cell-readonly"
        title="Un capítulo toma su fecha de inicio de sus subtareas, no admite una predecesora propia. Para condicionar el inicio del capítulo, definí la predecesora en su primera subtarea."
      >
        —
      </span>
    );
  }

  function commit() {
    if (draft === null) return;
    onChange(parsePredecessors(draft, uidById, taskUid));
    setDraft(null);
  }

  return (
    <input
      className="grid-input grid-input--predecessors"
      type="text"
      placeholder="ej: 1.2, 1.3CC+2"
      title={PREDECESSOR_LEGEND}
      value={draft ?? formatted}
      onFocus={() => setDraft(formatted)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(null);
      }}
    />
  );
}
