import { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { Modal } from './Modal';

export function CalendarSettingsDialog() {
  const calendar = useProjectStore((s) => s.calendar);
  const setCalendar = useProjectStore((s) => s.setCalendar);
  const [open, setOpen] = useState(false);
  const [newHoliday, setNewHoliday] = useState('');

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Configurar calendario">
        Calendario
      </button>
      {open && (
        <Modal title="Calendario del proyecto" onClose={() => setOpen(false)}>
          <label className="modal-radio-row">
            <input
              type="radio"
              name="calendar-mode"
              checked={!calendar.workOnWeekends}
              onChange={() => setCalendar({ ...calendar, workOnWeekends: false })}
            />
            Días hábiles (excluye fines de semana y feriados)
          </label>
          <label className="modal-radio-row">
            <input
              type="radio"
              name="calendar-mode"
              checked={calendar.workOnWeekends}
              onChange={() => setCalendar({ ...calendar, workOnWeekends: true })}
            />
            Días corridos
          </label>

          {!calendar.workOnWeekends && (
            <div className="holiday-editor">
              <h3>Feriados</h3>
              <div className="holiday-add-row">
                <input type="date" value={newHoliday} onChange={(e) => setNewHoliday(e.target.value)} />
                <button
                  type="button"
                  onClick={() => {
                    if (!newHoliday || calendar.holidays.includes(newHoliday)) return;
                    setCalendar({ ...calendar, holidays: [...calendar.holidays, newHoliday].sort() });
                    setNewHoliday('');
                  }}
                >
                  Agregar
                </button>
              </div>
              <ul className="holiday-list">
                {calendar.holidays.length === 0 && <li className="holiday-empty">Sin feriados cargados.</li>}
                {calendar.holidays.map((h) => (
                  <li key={h}>
                    <span>{h}</span>
                    <button
                      type="button"
                      onClick={() => setCalendar({ ...calendar, holidays: calendar.holidays.filter((x) => x !== h) })}
                      title="Quitar feriado"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
