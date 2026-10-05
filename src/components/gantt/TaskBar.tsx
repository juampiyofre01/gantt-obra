import { BAR_INSET, ROW_HEIGHT } from './ganttLayout';

interface TaskBarProps {
  x: number;
  y: number;
  width: number;
  color?: string;
  percent: number;
  critical?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

const BAR_HEIGHT = ROW_HEIGHT - BAR_INSET * 2;

export function TaskBar({ x, y, width, color, percent, critical, selected, onClick }: TaskBarProps) {
  const fill = color ?? 'var(--ink-300)';
  const stroke = critical ? 'var(--accent-critical)' : 'color-mix(in srgb, ' + fill + ' 60%, black)';
  const progressWidth = Math.min(100, Math.max(0, percent)) / 100 * width;

  return (
    <g onClick={onClick} className="gantt-bar-group" transform={`translate(${x}, ${y + BAR_INSET})`}>
      <rect
        width={width}
        height={BAR_HEIGHT}
        rx={4}
        fill={fill}
        fillOpacity={0.55}
        stroke={stroke}
        strokeWidth={critical ? 2 : 1}
      />
      {progressWidth > 0 && <rect width={progressWidth} height={BAR_HEIGHT} rx={4} fill={fill} />}
      {selected && (
        <rect
          width={width}
          height={BAR_HEIGHT}
          rx={4}
          fill="none"
          stroke="var(--accent-primary)"
          strokeWidth={2}
          strokeDasharray="3 2"
        />
      )}
    </g>
  );
}
