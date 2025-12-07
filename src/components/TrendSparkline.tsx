import { CSSProperties, useId, useState } from "react";

type TrendSparklineProps = {
  points: number[];
  labels?: string[];
  height?: number;
  stroke?: string;
  fill?: string;
};

const DEFAULT_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TrendSparkline({
  points,
  labels = DEFAULT_LABELS,
  height = 120,
  stroke = "#2563eb",
  fill = "rgba(37, 99, 235, 0.1)",
}: TrendSparklineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const sparkId = useId();

  const padding = { top: 30, bottom: 24, left: 10, right: 10 };
  const width = 320;
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;

  if (!points.length) {
    return null;
  }

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max === min ? 1 : max - min;
  const step = chartWidth / Math.max(points.length - 1, 1);

  const coords = points.map((value, index) => {
    const x = padding.left + index * step;
    const y = padding.top + chartHeight - ((value - min) / range) * chartHeight;
    return { x, y, value };
  });

  const pathData = coords
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
    )
    .join(" ");

  const areaPath = `${pathData} L ${padding.left + chartWidth} ${
    padding.top + chartHeight
  } L ${padding.left} ${padding.top + chartHeight} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="sparkline"
      role="img"
      aria-label="Mood trend over the past week"
      style={
        { "--spark-stroke": stroke, "--spark-fill": fill } as CSSProperties
      }
    >
      <defs>
        <linearGradient
          id={`spark-${sparkId}`}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor={fill} stopOpacity="0.9" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
        <filter
          id={`shadow-${sparkId}`}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Area fill */}
      <path d={areaPath} fill={`url(#spark-${sparkId})`} />

      {/* Line */}
      <path
        d={pathData}
        stroke="var(--spark-stroke)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Interactive points */}
      {coords.map((point, index) => {
        const isHovered = hoveredIndex === index;
        const isLast = index === coords.length - 1;
        const label = labels[index] || `Day ${index + 1}`;

        return (
          <g key={index}>
            {/* Invisible larger hit area */}
            <circle
              cx={point.x}
              cy={point.y}
              r={16}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />

            {/* Visible point */}
            <circle
              cx={point.x}
              cy={point.y}
              r={isHovered ? 6 : isLast ? 5 : 4}
              fill={isHovered || isLast ? "var(--spark-stroke)" : "white"}
              stroke={isHovered || isLast ? "#fff" : "var(--spark-stroke)"}
              strokeWidth={isHovered ? 2.5 : 2}
              style={{
                transition: "all 0.15s ease",
                filter: isHovered ? `url(#shadow-${sparkId})` : "none",
              }}
            />

            {/* Tooltip on hover */}
            {isHovered && (
              <g>
                <rect
                  x={point.x - 32}
                  y={point.y - 42}
                  width={64}
                  height={28}
                  rx={6}
                  fill="#1f2937"
                  filter={`url(#shadow-${sparkId})`}
                />
                <polygon
                  points={`${point.x - 5},${point.y - 14} ${point.x + 5},${
                    point.y - 14
                  } ${point.x},${point.y - 8}`}
                  fill="#1f2937"
                />
                <text
                  x={point.x}
                  y={point.y - 28}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="white"
                >
                  {label}
                </text>
                <text
                  x={point.x}
                  y={point.y - 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#9ca3af"
                >
                  {point.value} pts
                </text>
              </g>
            )}

            {/* Day label below */}
            <text
              x={point.x}
              y={height - 6}
              textAnchor="middle"
              fontSize="10"
              fill="#9ca3af"
              fontWeight="500"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
