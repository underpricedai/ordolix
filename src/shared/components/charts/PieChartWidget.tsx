"use client";
/**
 * Reusable pie/donut chart widget.
 * @module shared/components/charts/PieChartWidget
 */
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getChartColor, formatNumber } from "./chart-utils";

interface PieChartWidgetProps {
  data: Array<{ name: string; value: number; color?: string }>;
  height?: number;
  innerRadius?: number;
  showLegend?: boolean;
  showLabels?: boolean;
}

export function PieChartWidget({
  data,
  height = 300,
  innerRadius = 0,
  showLegend = true,
  showLabels = false,
}: PieChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius="80%"
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          label={showLabels ? ({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%` : undefined}
        >
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={entry.color ?? getChartColor(i)} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatNumber(Number(value))}
          contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }}
        />
        {showLegend && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  );
}
