"use client";
/**
 * Reusable bar chart widget.
 * @module shared/components/charts/BarChartWidget
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getChartColor, formatNumber } from "./chart-utils";

interface BarChartWidgetProps {
  data: Array<Record<string, string | number>>;
  bars: Array<{ dataKey: string; name?: string; color?: string; stackId?: string }>;
  xAxisKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
}

export function BarChartWidget({
  data,
  bars,
  xAxisKey = "name",
  height = 300,
  showGrid = true,
  showLegend = false,
}: BarChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
        <XAxis dataKey={xAxisKey} className="text-xs fill-muted-foreground" />
        <YAxis tickFormatter={formatNumber} className="text-xs fill-muted-foreground" />
        <Tooltip
          contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }}
          labelStyle={{ color: "hsl(var(--popover-foreground))" }}
        />
        {showLegend && <Legend />}
        {bars.map((bar, i) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name ?? bar.dataKey}
            fill={bar.color ?? getChartColor(i)}
            stackId={bar.stackId}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
