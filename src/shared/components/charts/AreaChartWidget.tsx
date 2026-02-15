"use client";
/**
 * Reusable area chart widget (stacked or regular).
 * @module shared/components/charts/AreaChartWidget
 */
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getChartColor, formatNumber } from "./chart-utils";

interface AreaChartWidgetProps {
  data: Array<Record<string, string | number>>;
  areas: Array<{ dataKey: string; name?: string; color?: string; stackId?: string }>;
  xAxisKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
}

export function AreaChartWidget({
  data,
  areas,
  xAxisKey = "name",
  height = 300,
  showGrid = true,
  showLegend = false,
}: AreaChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
        <XAxis dataKey={xAxisKey} className="text-xs fill-muted-foreground" />
        <YAxis tickFormatter={formatNumber} className="text-xs fill-muted-foreground" />
        <Tooltip
          contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }}
          labelStyle={{ color: "hsl(var(--popover-foreground))" }}
        />
        {showLegend && <Legend />}
        {areas.map((area, i) => (
          <Area
            key={area.dataKey}
            type="monotone"
            dataKey={area.dataKey}
            name={area.name ?? area.dataKey}
            stroke={area.color ?? getChartColor(i)}
            fill={area.color ?? getChartColor(i)}
            fillOpacity={0.3}
            stackId={area.stackId}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
