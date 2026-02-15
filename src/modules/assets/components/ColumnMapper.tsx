/**
 * ColumnMapper component.
 *
 * @description Two-column layout for mapping CSV column headers to
 * asset attribute definitions. Auto-detected matches are pre-selected.
 * Unmatched columns show a warning indicator.
 *
 * @module ColumnMapper
 */

"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";

interface AttributeDefinition {
  name: string;
  label: string;
  fieldType: string;
}

interface ColumnMapperProps {
  /** CSV column headers */
  headers: string[];
  /** Available attribute definitions */
  definitions: AttributeDefinition[];
  /** Current mapping (CSV header -> attribute name) */
  mapping: Record<string, string>;
  /** Called when user changes a mapping */
  onMappingChange: (mapping: Record<string, string>) => void;
}

/**
 * ColumnMapper renders a two-column layout: CSV column header on left,
 * attribute definition dropdown on right.
 *
 * @param props - ColumnMapperProps
 * @returns Column mapping editor component
 */
export function ColumnMapper({
  headers,
  definitions,
  mapping,
  onMappingChange,
}: ColumnMapperProps) {
  const t = useTranslations("assets");

  const handleChange = (csvHeader: string, attrName: string) => {
    const newMapping = { ...mapping };
    if (attrName === "__unmapped") {
      delete newMapping[csvHeader];
    } else {
      newMapping[csvHeader] = attrName;
    }
    onMappingChange(newMapping);
  };

  return (
    <div className="space-y-3" role="list" aria-label={t("import_column_mapping")}>
      {/* Header row */}
      <div className="grid grid-cols-2 gap-4 text-sm font-medium text-muted-foreground px-1">
        <span>{t("import_csv_column")}</span>
        <span>{t("import_maps_to")}</span>
      </div>

      {headers.map((header) => {
        const mapped = mapping[header];
        const isMapped = !!mapped;

        return (
          <div
            key={header}
            className="grid grid-cols-2 gap-4 items-center rounded-md border px-3 py-2"
            role="listitem"
          >
            {/* CSV column name */}
            <div className="flex items-center gap-2 min-w-0">
              {isMapped ? (
                <Check className="size-4 shrink-0 text-green-600" aria-hidden="true" />
              ) : (
                <AlertTriangle className="size-4 shrink-0 text-amber-500" aria-hidden="true" />
              )}
              <span className="truncate text-sm font-medium">{header}</span>
              {isMapped && (
                <Badge variant="secondary" className="ml-auto text-[10px] shrink-0">
                  {t("import_auto_detected")}
                </Badge>
              )}
            </div>

            {/* Attribute selector */}
            <Select
              value={mapped ?? "__unmapped"}
              onValueChange={(val) => handleChange(header, val)}
            >
              <SelectTrigger
                className="w-full"
                aria-label={t("import_select_mapping_for", { column: header })}
              >
                <SelectValue placeholder={t("import_unmapped")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unmapped">{t("import_unmapped")}</SelectItem>
                <SelectItem value="__name">{t("name")}</SelectItem>
                <SelectItem value="__status">{t("status")}</SelectItem>
                {definitions.map((def) => (
                  <SelectItem key={def.name} value={def.name}>
                    {def.label} ({def.fieldType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}
