"use client";
/**
 * Reusable line chart widget.
 * @module shared/components/charts/LineChartWidget
 */
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getChartColor, formatNumber } from "./chart-utils";

interface LineChartWidgetProps {
  data: Array<Record<string, string | number>>;
  lines: Array<{ dataKey: string; name?: string; color?: string; dashed?: boolean }>;
  xAxisKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
}

export function LineChartWidget({
  data,
  lines,
  xAxisKey = "name",
  height = 300,
  showGrid = true,
  showLegend = false,
}: LineChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
        <XAxis dataKey={xAxisKey} className="text-xs fill-muted-foreground" />
        <YAxis tickFormatter={formatNumber} className="text-xs fill-muted-foreground" />
        <Tooltip
          contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }}
          labelStyle={{ color: "hsl(var(--popover-foreground))" }}
        />
        {showLegend && <Legend />}
        {lines.map((line, i) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name ?? line.dataKey}
            stroke={line.color ?? getChartColor(i)}
            strokeWidth={2}
            strokeDasharray={line.dashed ? "5 5" : undefined}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
