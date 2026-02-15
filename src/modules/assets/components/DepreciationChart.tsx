"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

interface DepreciationChartProps {
  purchasePrice: number;
  salvageValue: number;
  usefulLifeMonths: number;
  depreciationMethod: "straight_line" | "declining_balance";
  purchaseDate: Date;
  currency?: string;
}

/**
 * DepreciationChart renders a Recharts AreaChart showing asset book value
 * declining over its useful life.
 *
 * @description Generates data points month by month using the specified
 * depreciation method (straight-line or double-declining balance).
 *
 * @param props - DepreciationChartProps
 * @returns An area chart visualization of depreciation
 */
export function DepreciationChart({
  purchasePrice,
  salvageValue,
  usefulLifeMonths,
  depreciationMethod,
  purchaseDate,
  currency = "USD",
}: DepreciationChartProps) {
  const t = useTranslations("assets");

  const data = useMemo(() => {
    const points: Array<{ month: number; bookValue: number; label: string }> = [];

    if (depreciationMethod === "straight_line") {
      const monthlyDep = (purchasePrice - salvageValue) / usefulLifeMonths;
      for (let i = 0; i <= usefulLifeMonths; i++) {
        const bookValue = Math.max(salvageValue, purchasePrice - monthlyDep * i);
        const date = new Date(purchaseDate);
        date.setMonth(date.getMonth() + i);
        points.push({
          month: i,
          bookValue: Math.round(bookValue * 100) / 100,
          label: new Intl.DateTimeFormat("en", {
            year: "numeric",
            month: "short",
          }).format(date),
        });
      }
    } else {
      // Double-declining balance
      const monthlyRate = 2 / usefulLifeMonths;
      let bookValue = purchasePrice;

      for (let i = 0; i <= usefulLifeMonths; i++) {
        const date = new Date(purchaseDate);
        date.setMonth(date.getMonth() + i);
        points.push({
          month: i,
          bookValue: Math.round(bookValue * 100) / 100,
          label: new Intl.DateTimeFormat("en", {
            year: "numeric",
            month: "short",
          }).format(date),
        });

        if (i < usefulLifeMonths) {
          const dep = bookValue * monthlyRate;
          if (bookValue - dep < salvageValue) {
            bookValue = salvageValue;
          } else {
            bookValue -= dep;
          }
        }
      }
    }

    return points;
  }, [purchasePrice, salvageValue, usefulLifeMonths, depreciationMethod, purchaseDate]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("depreciation_chart")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="bookValueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                interval={Math.max(1, Math.floor(usefulLifeMonths / 6) - 1)}
                className="text-muted-foreground"
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                width={80}
              />
              <Tooltip
                formatter={(value: number | undefined) => [
                  formatCurrency(value ?? 0),
                  t("book_value"),
                ]}
                labelFormatter={(label) => String(label)}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Area
                type="monotone"
                dataKey="bookValue"
                stroke="hsl(var(--primary))"
                fill="url(#bookValueGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
