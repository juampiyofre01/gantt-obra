import { useRef } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { computeProjectSummary } from '../../engine/projectSummary';

export function AppHeader() {
  const meta = useProjectStore((s) => s.meta);
  const tasks = useProjectStore((s) => s.tasks);
  const calendar = useProjectStore((s) => s.calendar);
  const setMeta = useProjectStore((s) => s.setMeta);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const summary = computeProjectSummary(tasks, calendar);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setMeta({ logoDataUrl: reader.result as string });
    reader.readAsDataURL(file);
  }

  return (
    <header className="app-header">
      <button type="button" className="app-header-logo" onClick={() => fileInputRef.current?.click()} title="Cargar logo">
        {meta.logoDataUrl ? <img src={meta.logoDataUrl} alt="Logo del proyecto" /> : <span>+ Logo</span>}
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleLogoChange} />

      <div className="app-header-main">
        <input
          className="app-header-title"
          value={meta.title}
          onChange={(e) => setMeta({ title: e.target.value })}
          placeholder="Nombre del proyecto"
        />
        <div className="app-header-fields">
          <input
            className="app-header-field"
            placeholder="Cliente"
            value={meta.client ?? ''}
            onChange={(e) => setMeta({ client: e.target.value })}
          />
          <input
            className="app-header-field"
            placeholder="Ubicación"
            value={meta.location ?? ''}
            onChange={(e) => setMeta({ location: e.target.value })}
          />
        </div>
      </div>

      <div className="app-header-stats">
        <div className="stat">
          <span className="stat-label">Plazo total</span>
          <span className="stat-value">
            {summary.startDate
              ? calendar.workOnWeekends
                ? `${summary.totalCalendarDays} días corridos`
                : `${summary.totalWorkDays} días hábiles (${summary.totalCalendarDays} corridos)`
              : '—'}
          </span>
          {summary.startDate && (
            <span className="stat-sub">
              {summary.startDate} → {summary.endDate}
            </span>
          )}
        </div>
        <div className="stat">
          <span className="stat-label">Volúmenes</span>
          <span className="stat-value">
            {summary.volumesByUnit.length > 0
              ? summary.volumesByUnit.map((v) => `${v.quantity.toLocaleString('es-AR')} ${v.unit}`).join(' · ')
              : '—'}
          </span>
        </div>
      </div>
    </header>
  );
}
