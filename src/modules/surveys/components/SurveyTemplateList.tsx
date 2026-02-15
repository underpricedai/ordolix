/**
 * Admin survey template list component.
 *
 * @description Displays a table of survey templates with name, trigger,
 * status, response count, and action menu (edit/delete).
 *
 * @module SurveyTemplateList
 */

"use client";

import { useTranslations } from "next-intl";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { trpc } from "@/shared/lib/trpc";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

interface SurveyTemplateListProps {
  /** Called when user clicks edit on a template */
  onEdit: (template: { id: string; name: string; description?: string | null; trigger: string; isActive: boolean; delayMinutes: number; questions: unknown }) => void;
}

/**
 * SurveyTemplateList displays admin template management table.
 *
 * @param props - SurveyTemplateListProps
 * @returns A table of survey templates
 */
export function SurveyTemplateList({ onEdit }: SurveyTemplateListProps) {
  const t = useTranslations("surveys");
  const tc = useTranslations("common");

  const utils = trpc.useUtils();

  const { data: templates, isLoading, error } = trpc.survey.listTemplates.useQuery();

  const deleteMutation = trpc.survey.deleteTemplate.useMutation({
    onSuccess: () => void utils.survey.listTemplates.invalidate(),
  });

  const toggleMutation = trpc.survey.updateTemplate.useMutation({
    onSuccess: () => void utils.survey.listTemplates.invalidate(),
  });

  if (isLoading) {
    return <TemplateListSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tc("name")}</TableHead>
            <TableHead className="w-[120px]">{t("trigger")}</TableHead>
            <TableHead className="w-[80px]">{tc("status")}</TableHead>
            <TableHead className="w-[100px]">{t("responses")}</TableHead>
            <TableHead className="w-[60px]">{tc("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {templates.map((tpl: any) => (
            <TableRow key={tpl.id}>
              <TableCell>
                <div>
                  <span className="font-medium">{tpl.name}</span>
                  {tpl.description && (
                    <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                      {tpl.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {tpl.trigger}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={tpl.isActive ? "default" : "secondary"} className="text-xs">
                  {tpl.isActive ? tc("active") : tc("inactive")}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm tabular-nums">
                  {tpl._count?.responses ?? 0}
                </span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8" aria-label={tc("actions")}>
                      <MoreHorizontal className="size-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(tpl)}>
                      <Pencil className="mr-2 size-4" aria-hidden="true" />
                      {tc("edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        toggleMutation.mutate({
                          id: tpl.id,
                          isActive: !tpl.isActive,
                        })
                      }
                    >
                      {tpl.isActive ? (
                        <>
                          <ToggleLeft className="mr-2 size-4" aria-hidden="true" />
                          {t("deactivate")}
                        </>
                      ) : (
                        <>
                          <ToggleRight className="mr-2 size-4" aria-hidden="true" />
                          {t("activate")}
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate({ id: tpl.id })}
                    >
                      <Trash2 className="mr-2 size-4" aria-hidden="true" />
                      {tc("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TemplateListSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Skeleton className="h-4 w-20" /></TableHead>
            <TableHead className="w-[120px]"><Skeleton className="h-4 w-14" /></TableHead>
            <TableHead className="w-[80px]"><Skeleton className="h-4 w-10" /></TableHead>
            <TableHead className="w-[100px]"><Skeleton className="h-4 w-12" /></TableHead>
            <TableHead className="w-[60px]"><Skeleton className="size-4" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-40" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-8" /></TableCell>
              <TableCell><Skeleton className="size-8 rounded" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
