"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormTemplate = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormFieldSchema = any;

interface FormRendererProps {
  /** The form template ID to render */
  templateId: string;
  /** Optional issue ID to associate the submission with */
  issueId?: string;
  /** Called after successful submission */
  onSuccess?: () => void;
}

/**
 * FormRenderer displays and handles a form based on a template configuration.
 *
 * @description Dynamically renders form fields based on the template schema.
 * Validates required fields on submit. Uses tRPC form.submit mutation.
 *
 * @param props - FormRendererProps
 * @returns Form renderer component
 */
export function FormRenderer({ templateId, issueId, onSuccess }: FormRendererProps) {
  const t = useTranslations("forms");
  const tc = useTranslations("common");

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    data: template,
    isLoading,
    error,
  } = trpc.form.getTemplate.useQuery(
    { id: templateId },
    { enabled: !!templateId },
  );

  const submitMutation = trpc.form.submit.useMutation({
    onSuccess: () => onSuccess?.(),
  });

  const updateField = useCallback((fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const templateData = template as FormTemplate;
    if (!templateData?.schema) return false;

    const newErrors: Record<string, string> = {};
    for (const field of templateData.schema as FormFieldSchema[]) {
      if (field.required) {
        const value = formData[field.id];
        if (value === undefined || value === null || value === "") {
          newErrors[field.id] = `${field.label} is required`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [template, formData]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      submitMutation.mutate({
        formTemplateId: templateId,
        data: formData,
        issueId,
      });
    },
    [templateId, formData, issueId, validate, submitMutation],
  );

  if (isLoading) return <FormRendererSkeleton />;

  if (error || !template) {
    return (
      <EmptyState
        title={tc("error")}
        description="Form template not found."
      />
    );
  }

  const templateData = template as FormTemplate;
  const fields: FormFieldSchema[] = templateData.schema ?? [];

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{templateData.name}</CardTitle>
          {templateData.description && (
            <CardDescription>{templateData.description}</CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {fields.map((field: FormFieldSchema) => {
            const fieldError = errors[field.id];
            const value = formData[field.id];

            return (
              <div key={field.id} className="grid gap-1.5">
                <Label htmlFor={`form-${field.id}`}>
                  {field.label}
                  {field.required && (
                    <span className="text-destructive ms-1" aria-label="required">
                      *
                    </span>
                  )}
                </Label>

                {field.type === "text" && (
                  <Input
                    id={`form-${field.id}`}
                    value={(value as string) ?? ""}
                    onChange={(e) => updateField(field.id, e.target.value)}
                    placeholder={field.label}
                    aria-required={field.required}
                    aria-invalid={!!fieldError}
                  />
                )}

                {field.type === "number" && (
                  <Input
                    id={`form-${field.id}`}
                    type="number"
                    value={(value as string) ?? ""}
                    onChange={(e) => updateField(field.id, e.target.value)}
                    placeholder="0"
                    aria-required={field.required}
                    aria-invalid={!!fieldError}
                  />
                )}

                {field.type === "textarea" && (
                  <Textarea
                    id={`form-${field.id}`}
                    value={(value as string) ?? ""}
                    onChange={(e) => updateField(field.id, e.target.value)}
                    placeholder={field.label}
                    rows={3}
                    aria-required={field.required}
                    aria-invalid={!!fieldError}
                  />
                )}

                {field.type === "date" && (
                  <Input
                    id={`form-${field.id}`}
                    type="date"
                    value={(value as string) ?? ""}
                    onChange={(e) => updateField(field.id, e.target.value)}
                    aria-required={field.required}
                    aria-invalid={!!fieldError}
                  />
                )}

                {field.type === "checkbox" && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`form-${field.id}`}
                      checked={(value as boolean) ?? false}
                      onCheckedChange={(checked) =>
                        updateField(field.id, checked)
                      }
                      aria-required={field.required}
                    />
                    <Label
                      htmlFor={`form-${field.id}`}
                      className="text-sm font-normal"
                    >
                      {field.label}
                    </Label>
                  </div>
                )}

                {(field.type === "select" || field.type === "multiselect") && (
                  <Select
                    value={(value as string) ?? ""}
                    onValueChange={(val) => updateField(field.id, val)}
                  >
                    <SelectTrigger
                      id={`form-${field.id}`}
                      className="w-full"
                      aria-required={field.required}
                      aria-invalid={!!fieldError}
                    >
                      <SelectValue placeholder={`Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((opt: string) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {fieldError && (
                  <p className="text-xs text-destructive" role="alert">
                    {fieldError}
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline">
            {tc("cancel")}
          </Button>
          <Button type="submit" disabled={submitMutation.isPending}>
            {submitMutation.isPending ? (
              tc("loading")
            ) : (
              <>
                <Send className="mr-2 size-4" aria-hidden="true" />
                {t("submitForm")}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

/**
 * Skeleton loading state for the form renderer.
 */
function FormRendererSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="grid gap-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
      </CardFooter>
    </Card>
  );
}
