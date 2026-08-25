import { useRef, useState } from 'react';
import { useProjectStore } from './store/useProjectStore';
import { AppHeader } from './components/layout/AppHeader';
import { Toolbar } from './components/common/Toolbar';
import { TaskGrid } from './components/grid/TaskGrid';
import { GanttChart } from './components/gantt/GanttChart';
import type { ZoomLevel } from './components/gantt/ganttLayout';

export default function App() {
  const tasks = useProjectStore((s) => s.tasks);
  const calendar = useProjectStore((s) => s.calendar);
  const palette = useProjectStore((s) => s.palette);
  const scheduleIssue = useProjectStore((s) => s.scheduleIssue);
  const showCriticalPath = useProjectStore((s) => s.showCriticalPath);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [zoom, setZoom] = useState<ZoomLevel>('week');

  const gridPanelRef = useRef<HTMLDivElement>(null);
  const ganttPanelRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef<'grid' | 'gantt' | null>(null);

  function handleGridScroll(scrollTop: number) {
    if (syncingRef.current === 'gantt') {
      syncingRef.current = null;
      return;
    }
    syncingRef.current = 'grid';
    if (ganttPanelRef.current) ganttPanelRef.current.scrollTop = scrollTop;
  }

  function handleGanttScroll(scrollTop: number) {
    if (syncingRef.current === 'grid') {
      syncingRef.current = null;
      return;
    }
    syncingRef.current = 'gantt';
    if (gridPanelRef.current) gridPanelRef.current.scrollTop = scrollTop;
  }

  return (
    <div className="app-shell">
      <AppHeader />
      {scheduleIssue && <div className="schedule-issue">{scheduleIssue}</div>}
      <Toolbar selectedUid={selectedUid} onSelect={setSelectedUid} zoom={zoom} onZoomChange={setZoom} />
      <div className="workspace">
        <div className="grid-panel" ref={gridPanelRef} onScroll={(e) => handleGridScroll(e.currentTarget.scrollTop)}>
          <TaskGrid tasks={tasks} calendar={calendar} selectedUid={selectedUid} onSelect={setSelectedUid} />
        </div>
        <GanttChart
          ref={ganttPanelRef}
          tasks={tasks}
          calendar={calendar}
          palette={palette}
          zoom={zoom}
          showCriticalPath={showCriticalPath}
          selectedUid={selectedUid}
          onSelect={setSelectedUid}
          onScroll={handleGanttScroll}
        />
      </div>
    </div>
  );
}
