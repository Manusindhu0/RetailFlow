interface Slice {
  label: string;
  value: number;
  color: string;
}

interface SimplePieChartProps {
  data: Slice[];
  formatValue?: (v: number) => string;
  size?: number;
}

export function SimplePieChart({ data, formatValue, size = 140 }: SimplePieChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">No data</div>;

  // Build conic-gradient stops
  let cumulative = 0;
  const stops = data.map(d => {
    const pct = (d.value / total) * 100;
    const start = cumulative;
    cumulative += pct;
    return `${d.color} ${start.toFixed(1)}% ${cumulative.toFixed(1)}%`;
  });

  return (
    <div className="flex items-center gap-6">
      {/* Pie */}
      <div
        className="rounded-full flex-shrink-0 border-4 border-border"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${stops.join(", ")})`,
        }}
      />
      {/* Legend */}
      <div className="space-y-2 min-w-0">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{d.label}</p>
              <p className="text-xs text-muted-foreground">
                {formatValue ? formatValue(d.value) : d.value}
                <span className="ml-1 opacity-60">({((d.value / total) * 100).toFixed(0)}%)</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
