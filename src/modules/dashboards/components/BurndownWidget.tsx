"use client";
/**
 * Sprint burndown chart widget for dashboards.
 * @module dashboards/components/BurndownWidget
 */
import { LineChartWidget } from "@/shared/components/charts";

interface BurndownWidgetProps {
  data: Array<{ day: string; remaining: number; ideal: number }>;
}

export function BurndownWidget({ data }: BurndownWidgetProps) {
  return (
    <LineChartWidget
      data={data}
      xAxisKey="day"
      lines={[
        { dataKey: "ideal", name: "Ideal", color: "hsl(var(--muted-foreground))", dashed: true },
        { dataKey: "remaining", name: "Remaining", color: "hsl(var(--chart-1, 220 70% 50%))" },
      ]}
      height={250}
      showLegend
    />
  );
}
