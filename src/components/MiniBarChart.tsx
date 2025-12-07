import { useState } from "react";

type MiniBarChartProps = {
  data: { label: string; value: number; hint?: string; count?: number }[];
  maxValue?: number;
};

export default function MiniBarChart({ data, maxValue }: MiniBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data.length) return null;

  const computedMax =
    maxValue ?? Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="mini-bars">
      {data.map((item, index) => {
        const height = Math.max(8, (item.value / computedMax) * 100);
        const isHovered = hoveredIndex === index;

        return (
          <div
            key={item.label}
            className={`mini-bar ${isHovered ? "hovered" : ""}`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Tooltip */}
            {isHovered && (
              <div className="bar-tooltip">
                <div className="bar-tooltip-label">{item.label}</div>
                <div className="bar-tooltip-value">
                  {item.hint ?? `${item.value} min`}
                </div>
              </div>
            )}

            <div className="bar-shell">
              <div
                className="bar-fill"
                style={{
                  height: `${height}%`,
                  opacity: isHovered ? 1 : 0.75,
                  transform: isHovered ? "scaleX(1.08)" : "scaleX(1)",
                }}
              />
            </div>

            <span className="mini-bar-label">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
