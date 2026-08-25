interface SummaryBarProps {
  x: number;
  y: number;
  width: number;
  onClick?: () => void;
}

const BAR_TOP = 6;
const BAR_THICKNESS = 7;
const CAP_HEIGHT = 8;
const CAP_WIDTH = 6;

export function SummaryBar({ x, y, width, onClick }: SummaryBarProps) {
  const top = y + BAR_TOP;
  return (
    <g onClick={onClick} className="gantt-bar-group">
      <rect x={x} y={top} width={width} height={BAR_THICKNESS} fill="var(--ink-900)" />
      <polygon
        points={`${x},${top + BAR_THICKNESS} ${x + CAP_WIDTH},${top + BAR_THICKNESS} ${x},${top + BAR_THICKNESS + CAP_HEIGHT}`}
        fill="var(--ink-900)"
      />
      <polygon
        points={`${x + width},${top + BAR_THICKNESS} ${x + width - CAP_WIDTH},${top + BAR_THICKNESS} ${x + width},${top + BAR_THICKNESS + CAP_HEIGHT}`}
        fill="var(--ink-900)"
      />
    </g>
  );
}
