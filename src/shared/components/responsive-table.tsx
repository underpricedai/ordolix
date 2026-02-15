"use client";

import * as React from "react";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { cn } from "@/shared/lib/utils";

/**
 * Column definition for ResponsiveTable.
 *
 * @description priority controls mobile visibility:
 * 1 = always visible, higher values hidden first on small screens.
 * minBreakpoint can override to show at specific breakpoints.
 */
export interface ResponsiveColumnDef<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** 1 = always visible, higher = hidden first on mobile. Default: 3 */
  priority?: number;
  /** Override: show this column at this breakpoint and above */
  minBreakpoint?: "sm" | "md" | "lg";
  /** Optional className for the column */
  className?: string;
}

interface ResponsiveTableProps<T> {
  columns: ResponsiveColumnDef<T>[];
  data: T[];
  /** Unique key extractor for each row */
  rowKey: (row: T) => string;
  /** Optional mobile card renderer — replaces the table entirely on mobile */
  mobileCard?: (row: T) => React.ReactNode;
  /** Optional click handler for rows */
  onRowClick?: (row: T) => void;
  /** Optional className for the wrapper */
  className?: string;
  /** Empty state message */
  emptyMessage?: string;
}

const breakpointClass: Record<string, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

function getColumnVisibilityClass(col: ResponsiveColumnDef<unknown>): string {
  if (col.minBreakpoint) {
    return breakpointClass[col.minBreakpoint] ?? "";
  }
  const priority = col.priority ?? 3;
  if (priority <= 1) return ""; // always visible
  if (priority === 2) return "hidden sm:table-cell";
  if (priority === 3) return "hidden md:table-cell";
  return "hidden lg:table-cell";
}

/**
 * Responsive table that adapts to screen size.
 *
 * @description On mobile, if mobileCard is provided, renders a card list.
 * Otherwise, hides lower-priority columns. Uses shadcn Table internally.
 *
 * @example
 * <ResponsiveTable
 *   columns={[
 *     { key: "key", header: "Key", cell: (r) => r.key, priority: 1 },
 *     { key: "summary", header: "Summary", cell: (r) => r.summary, priority: 1 },
 *     { key: "status", header: "Status", cell: (r) => r.status, priority: 2 },
 *   ]}
 *   data={issues}
 *   rowKey={(r) => r.id}
 *   mobileCard={(r) => <IssueCard issue={r} />}
 * />
 */
export function ResponsiveTable<T>({
  columns,
  data,
  rowKey,
  mobileCard,
  onRowClick,
  className,
  emptyMessage,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (isMobile && mobileCard) {
    return (
      <div className={cn("flex flex-col gap-2", className)} role="list">
        {data.length === 0 && emptyMessage && (
          <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        )}
        {data.map((row) => (
          <div
            key={rowKey(row)}
            role="listitem"
            className={onRowClick ? "cursor-pointer" : undefined}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            onKeyDown={
              onRowClick
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onRowClick(row);
                    }
                  }
                : undefined
            }
            tabIndex={onRowClick ? 0 : undefined}
          >
            {mobileCard(row)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead
              key={col.key}
              className={cn(
                getColumnVisibilityClass(col as ResponsiveColumnDef<unknown>),
                col.className,
              )}
            >
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 && emptyMessage && (
          <TableRow>
            <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
        {data.map((row) => (
          <TableRow
            key={rowKey(row)}
            className={onRowClick ? "cursor-pointer" : undefined}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {columns.map((col) => (
              <TableCell
                key={col.key}
                className={cn(
                  getColumnVisibilityClass(col as ResponsiveColumnDef<unknown>),
                  col.className,
                )}
              >
                {col.cell(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
