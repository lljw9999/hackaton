import { CSSProperties, useId } from 'react';

type TrendSparklineProps = {
  points: number[];
  height?: number;
  stroke?: string;
  fill?: string;
};

export default function TrendSparkline({
  points,
  height = 64,
  stroke = '#2563eb',
  fill = 'rgba(37, 99, 235, 0.1)',
}: TrendSparklineProps) {
  const width = 220;
  const sparkId = useId();

  if (!points.length) {
    return null;
  }

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max === min ? 1 : max - min;
  const step = width / Math.max(points.length - 1, 1);
  const coords = points.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / range) * height;
    return { x, y };
  });

  const pathData = coords
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');

  const areaPath = `${pathData} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="sparkline"
      role="presentation"
      aria-hidden="true"
      style={{ '--spark-stroke': stroke, '--spark-fill': fill } as CSSProperties}
    >
      <defs>
        <linearGradient id={`spark-${sparkId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={fill} stopOpacity="0.9" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${sparkId})`} />
      <path d={pathData} stroke="var(--spark-stroke)" strokeWidth="3" fill="none" strokeLinecap="round" />
      {coords.map((point, index) => (
        <circle
          key={point.x}
          cx={point.x}
          cy={point.y}
          r={index === coords.length - 1 ? 4.5 : 3.25}
          fill={index === coords.length - 1 ? 'var(--spark-stroke)' : 'white'}
          stroke={index === coords.length - 1 ? '#fff' : 'var(--spark-stroke)'}
          strokeWidth={index === coords.length - 1 ? 2 : 1.5}
        />
      ))}
    </svg>
  );
}
