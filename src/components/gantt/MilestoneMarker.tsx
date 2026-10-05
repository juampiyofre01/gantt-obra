import { MILESTONE_SIZE as SIZE, ROW_HEIGHT } from './ganttLayout';

interface MilestoneMarkerProps {
  x: number;
  y: number;
  label: string;
  critical?: boolean;
  onClick?: () => void;
}

export function MilestoneMarker({ x, y, label, critical, onClick }: MilestoneMarkerProps) {
  const cy = y + ROW_HEIGHT / 2;
  const fill = critical ? 'var(--accent-critical)' : 'var(--ink-900)';
  return (
    <g onClick={onClick} className="gantt-bar-group">
      <rect
        x={x - SIZE / 2}
        y={cy - SIZE / 2}
        width={SIZE}
        height={SIZE}
        fill={fill}
        transform={`rotate(45 ${x} ${cy})`}
      />
      <text x={x + SIZE + 4} y={cy} dominantBaseline="middle" className="gantt-milestone-label">
        {label}
      </text>
    </g>
  );
}
