"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Filter, X, Check } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Separator } from "@/shared/components/ui/separator";
import { cn } from "@/shared/lib/utils";

/**
 * A selectable filter option with id and display label.
 */
export interface FilterOption {
  id: string;
  label: string;
}

/**
 * Active filter values keyed by filter category.
 */
export interface ActiveFilters {
  status: string[];
  assignee: string[];
  priority: string[];
  type: string[];
  label: string[];
}

interface IssueFiltersProps {
  /** Current active filters */
  filters: ActiveFilters;
  /** Callback when filters change */
  onFiltersChange: (filters: ActiveFilters) => void;
  /** Available status options */
  statusOptions?: FilterOption[];
  /** Available assignee options */
  assigneeOptions?: FilterOption[];
  /** Available priority options */
  priorityOptions?: FilterOption[];
  /** Available type options */
  typeOptions?: FilterOption[];
  /** Available label options */
  labelOptions?: FilterOption[];
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Default filter options used when no options are provided from the server.
 */
const DEFAULT_STATUS_OPTIONS: FilterOption[] = [
  { id: "todo", label: "To Do" },
  { id: "in-progress", label: "In Progress" },
  { id: "in-review", label: "In Review" },
  { id: "done", label: "Done" },
];

const DEFAULT_PRIORITY_OPTIONS: FilterOption[] = [
  { id: "highest", label: "Highest" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
  { id: "lowest", label: "Lowest" },
];

const DEFAULT_TYPE_OPTIONS: FilterOption[] = [
  { id: "task", label: "Task" },
  { id: "bug", label: "Bug" },
  { id: "story", label: "Story" },
  { id: "epic", label: "Epic" },
  { id: "subtask", label: "Sub-task" },
];

/**
 * IssueFilters renders a filter bar with popover checkboxes for each filter category.
 *
 * @description Provides filters for status, assignee, priority, type, and label.
 * Each filter is a Popover with checkbox items. Active filters are displayed as
 * removable badges. Includes a clear-all button when any filters are active.
 * @param props - IssueFiltersProps
 * @returns A horizontal filter bar component
 *
 * @example
 * <IssueFilters
 *   filters={activeFilters}
 *   onFiltersChange={setActiveFilters}
 *   statusOptions={statuses}
 * />
 */
export function IssueFilters({
  filters,
  onFiltersChange,
  statusOptions = DEFAULT_STATUS_OPTIONS,
  assigneeOptions = [],
  priorityOptions = DEFAULT_PRIORITY_OPTIONS,
  typeOptions = DEFAULT_TYPE_OPTIONS,
  labelOptions = [],
  className,
}: IssueFiltersProps) {
  const t = useTranslations("issues");
  const tc = useTranslations("common");

  const totalActiveFilters =
    filters.status.length +
    filters.assignee.length +
    filters.priority.length +
    filters.type.length +
    filters.label.length;

  const handleToggleFilter = useCallback(
    (category: keyof ActiveFilters, id: string) => {
      const current = filters[category];
      const updated = current.includes(id)
        ? current.filter((v) => v !== id)
        : [...current, id];
      onFiltersChange({ ...filters, [category]: updated });
    },
    [filters, onFiltersChange],
  );

  const handleRemoveFilter = useCallback(
    (category: keyof ActiveFilters, id: string) => {
      onFiltersChange({
        ...filters,
        [category]: filters[category].filter((v) => v !== id),
      });
    },
    [filters, onFiltersChange],
  );

  const handleClearAll = useCallback(() => {
    onFiltersChange({
      status: [],
      assignee: [],
      priority: [],
      type: [],
      label: [],
    });
  }, [onFiltersChange]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Filter buttons row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="size-4" aria-hidden="true" />
          <span>{tc("filter")}</span>
        </div>

        <Separator orientation="vertical" className="h-5" />

        <FilterPopover
          label={t("filterByStatus")}
          options={statusOptions}
          selected={filters.status}
          onToggle={(id) => handleToggleFilter("status", id)}
        />

        <FilterPopover
          label={t("filterByPriority")}
          options={priorityOptions}
          selected={filters.priority}
          onToggle={(id) => handleToggleFilter("priority", id)}
        />

        <FilterPopover
          label={t("filterByType")}
          options={typeOptions}
          selected={filters.type}
          onToggle={(id) => handleToggleFilter("type", id)}
        />

        {assigneeOptions.length > 0 && (
          <FilterPopover
            label={t("filterByAssignee")}
            options={assigneeOptions}
            selected={filters.assignee}
            onToggle={(id) => handleToggleFilter("assignee", id)}
          />
        )}

        {labelOptions.length > 0 && (
          <FilterPopover
            label={t("labels")}
            options={labelOptions}
            selected={filters.label}
            onToggle={(id) => handleToggleFilter("label", id)}
          />
        )}

        {totalActiveFilters > 0 && (
          <>
            <Separator orientation="vertical" className="h-5" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="mr-1 size-3" aria-hidden="true" />
              {tc("reset")}
            </Button>
          </>
        )}
      </div>

      {/* Active filter badges */}
      {totalActiveFilters > 0 && (
        <div
          className="flex flex-wrap gap-1.5"
          role="list"
          aria-label={tc("filter")}
        >
          {renderActiveBadges(filters.status, statusOptions, "status", handleRemoveFilter)}
          {renderActiveBadges(filters.priority, priorityOptions, "priority", handleRemoveFilter)}
          {renderActiveBadges(filters.type, typeOptions, "type", handleRemoveFilter)}
          {renderActiveBadges(filters.assignee, assigneeOptions, "assignee", handleRemoveFilter)}
          {renderActiveBadges(filters.label, labelOptions, "label", handleRemoveFilter)}
        </div>
      )}
    </div>
  );
}

/**
 * Renders Badge elements for active filter values in a given category.
 */
function renderActiveBadges(
  selected: string[],
  options: FilterOption[],
  category: keyof ActiveFilters,
  onRemove: (category: keyof ActiveFilters, id: string) => void,
) {
  return selected.map((id) => {
    const option = options.find((o) => o.id === id);
    const label = option?.label ?? id;
    return (
      <Badge
        key={`${category}-${id}`}
        variant="secondary"
        className="cursor-pointer gap-1 pe-1.5"
        role="listitem"
      >
        <span className="text-xs text-muted-foreground capitalize">
          {category}:
        </span>
        {label}
        <button
          type="button"
          onClick={() => onRemove(category, id)}
          className="ms-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
          aria-label={`Remove ${category} filter: ${label}`}
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      </Badge>
    );
  });
}

/**
 * FilterPopover renders a single filter category as a popover with checkboxes.
 */
function FilterPopover({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const count = selected.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 border-dashed px-2.5 text-xs"
          aria-expanded={open}
        >
          {label}
          {count > 0 && (
            <Badge variant="secondary" className="ms-1.5 h-4 px-1 text-[10px]">
              {count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1" role="group" aria-label={label}>
          {options.map((option) => {
            const isSelected = selected.includes(option.id);
            return (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                  isSelected && "bg-accent/50",
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggle(option.id)}
                  aria-label={option.label}
                />
                <span className="flex-1">{option.label}</span>
                {isSelected && (
                  <Check className="size-3.5 text-primary" aria-hidden="true" />
                )}
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
