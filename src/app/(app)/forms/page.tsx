"use client";

import { useTranslations } from "next-intl";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  ClipboardList,
} from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormTemplate = any;

/**
 * Forms page listing form templates with access to form builder.
 *
 * @description Shows a table of form templates with name, field count,
 * active status, and submission count. Includes create button.
 */
export default function FormsPage() {
  const t = useTranslations("forms");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const {
    data: templatesData,
    isLoading,
    error,
  } = trpc.form.listTemplates.useQuery({}, { enabled: true });

  const templates: FormTemplate[] = templatesData ?? [];

  return (
    <>
      <AppHeader breadcrumbs={[{ label: tn("forms") }]} />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              Create and manage form templates for data collection.
            </p>
          </div>
          <Button>
            <Plus className="mr-2 size-4" aria-hidden="true" />
            {t("createForm")}
          </Button>
        </div>

        {/* Templates table */}
        {isLoading ? (
          <FormsTableSkeleton />
        ) : error ? (
          <EmptyState
            icon={<ClipboardList className="size-12" />}
            title={tc("error")}
            description={tc("retry")}
            action={
              <Button variant="outline" onClick={() => window.location.reload()}>
                {tc("retry")}
              </Button>
            }
          />
        ) : templates.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="size-12" />}
            title={t("title")}
            description="No form templates yet. Create your first form."
            action={
              <Button>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                {t("createForm")}
              </Button>
            }
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form Name</TableHead>
                  <TableHead className="w-[100px]">Fields</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[120px]">{t("submissions")}</TableHead>
                  <TableHead className="w-[60px]">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template: FormTemplate) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{template.name}</span>
                        {template.description && (
                          <span className="text-xs text-muted-foreground">
                            {template.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {(template.schema as unknown[])?.length ?? 0} fields
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {template.isActive ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {template.submissionCount ?? 0}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`${tc("actions")} for ${template.name}`}
                          >
                            <MoreHorizontal className="size-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 size-4" aria-hidden="true" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Pencil className="mr-2 size-4" aria-hidden="true" />
                            {tc("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
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
        )}
      </div>
    </>
  );
}

/**
 * Skeleton loading state for the forms table.
 */
function FormsTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableHead key={i}><Skeleton className="h-4 w-20" /></TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </TableCell>
              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-8" /></TableCell>
              <TableCell><Skeleton className="size-6" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
