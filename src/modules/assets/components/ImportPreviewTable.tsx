/**
 * ImportPreviewTable component.
 *
 * @description Renders a table showing the first N rows of CSV data.
 * Cells with validation errors have a red border and tooltip with
 * the error message. Valid cells show the parsed value.
 *
 * @module ImportPreviewTable
 */

"use client";

import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { Badge } from "@/shared/components/ui/badge";

interface PreviewRow {
  rowIndex: number;
  rawData: Record<string, string>;
  valid: boolean;
  errors: { field: string; message: string }[];
  parsedValues: Record<string, unknown>;
}

interface ImportPreviewTableProps {
  /** CSV column headers */
  headers: string[];
  /** Preview row results with validation */
  rows: PreviewRow[];
  /** Column mapping (CSV header -> attribute) */
  mapping: Record<string, string>;
}

/**
 * ImportPreviewTable renders CSV preview rows with per-cell
 * validation error highlighting.
 *
 * @param props - ImportPreviewTableProps
 * @returns Preview table component
 */
export function ImportPreviewTable({
  headers,
  rows,
  mapping,
}: ImportPreviewTableProps) {
  const t = useTranslations("assets");

  return (
    <TooltipProvider>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">{t("import_row")}</TableHead>
              {headers.map((h) => (
                <TableHead key={h}>
                  <div className="flex items-center gap-1.5">
                    <span>{h}</span>
                    {mapping[h] && (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {mapping[h]}
                      </Badge>
                    )}
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-[80px]">{t("status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const errorFields = new Set(row.errors.map((e) => e.field));
              const errorMap = new Map(row.errors.map((e) => [e.field, e.message]));

              return (
                <TableRow key={row.rowIndex}>
                  <TableCell className="text-muted-foreground text-xs">
                    {row.rowIndex + 1}
                  </TableCell>
                  {headers.map((h) => {
                    const hasError = errorFields.has(h);
                    const cellValue = row.rawData[h] ?? "";

                    return (
                      <TableCell
                        key={h}
                        className={hasError ? "border-2 border-destructive bg-destructive/5" : ""}
                      >
                        {hasError ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm text-destructive cursor-help">
                                {cellValue || "-"}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{errorMap.get(h)}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-sm">{cellValue || "-"}</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    {row.valid ? (
                      <Badge variant="secondary" className="text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                        {t("import_valid")}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        {t("import_invalid")}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
