interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: BarData[];
  formatValue?: (v: number) => string;
  height?: number;
}

export function SimpleBarChart({ data, formatValue, height = 160 }: SimpleBarChartProps) {
  if (!data.length) return <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">No data</div>;

  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="w-full">
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              {/* Tooltip on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-foreground bg-popover border border-border rounded px-1.5 py-0.5 whitespace-nowrap">
                {formatValue ? formatValue(d.value) : d.value}
              </div>
              <div className="w-full relative rounded-t-md overflow-hidden bg-secondary/40 flex items-end" style={{ height: `${height - 28}px` }}>
                <div
                  className="w-full rounded-t-md transition-all duration-500"
                  style={{
                    height: `${pct}%`,
                    background: d.color ?? "hsl(var(--primary))",
                    opacity: pct > 0 ? 1 : 0.2,
                    minHeight: pct > 0 ? "4px" : 0,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {/* X Labels */}
      <div className="flex gap-1.5 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-muted-foreground truncate" title={d.label}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
