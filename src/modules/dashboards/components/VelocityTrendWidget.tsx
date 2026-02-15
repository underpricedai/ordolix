"use client";
/**
 * Sprint velocity trend chart widget.
 * @module dashboards/components/VelocityTrendWidget
 */
import { BarChartWidget } from "@/shared/components/charts";

interface VelocityTrendWidgetProps {
  data: Array<{ sprint: string; committed: number; completed: number }>;
}

export function VelocityTrendWidget({ data }: VelocityTrendWidgetProps) {
  return (
    <BarChartWidget
      data={data}
      xAxisKey="sprint"
      bars={[
        { dataKey: "committed", name: "Committed", color: "hsl(var(--chart-2, 160 60% 45%))" },
        { dataKey: "completed", name: "Completed", color: "hsl(var(--chart-1, 220 70% 50%))" },
      ]}
      height={250}
      showLegend
    />
  );
}
