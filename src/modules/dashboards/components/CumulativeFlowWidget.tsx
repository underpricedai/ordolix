"use client";
/**
 * Cumulative flow diagram widget.
 * @module dashboards/components/CumulativeFlowWidget
 */
import { AreaChartWidget } from "@/shared/components/charts";

interface CumulativeFlowWidgetProps {
  data: Array<Record<string, string | number>>;
  statuses: Array<{ key: string; name: string; color?: string }>;
}

export function CumulativeFlowWidget({ data, statuses }: CumulativeFlowWidgetProps) {
  return (
    <AreaChartWidget
      data={data}
      xAxisKey="date"
      areas={statuses.map((s) => ({
        dataKey: s.key,
        name: s.name,
        color: s.color,
        stackId: "status",
      }))}
      height={250}
      showLegend
    />
  );
}
