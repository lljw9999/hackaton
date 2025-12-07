type MiniBarChartProps = {
  data: { label: string; value: number; hint?: string }[];
  maxValue?: number;
};

export default function MiniBarChart({ data, maxValue }: MiniBarChartProps) {
  if (!data.length) return null;

  const computedMax = maxValue ?? Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="mini-bars">
      {data.map((item) => {
        const height = Math.max(10, (item.value / computedMax) * 100);
        return (
          <div key={item.label} className="mini-bar">
            <div className="bar-shell" aria-hidden>
              <div className="bar-fill" style={{ height: `${height}%` }} />
            </div>
            <span className="mini-bar-label">{item.label}</span>
            <span className="mini-bar-hint">{item.hint ?? `${item.value}m`}</span>
          </div>
        );
      })}
    </div>
  );
}
