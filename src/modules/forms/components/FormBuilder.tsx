"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Trash2,
  Save,
  Type,
  Hash,
  ListChecks,
  CheckSquare,
  CalendarDays,
  AlignLeft,
  Eye,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
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
import { Switch } from "@/shared/components/ui/switch";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";
import { trpc } from "@/shared/lib/trpc";

/** Field types available in the form builder */
const FIELD_TYPES = [
  { value: "text", label: "Text", icon: Type },
  { value: "number", label: "Number", icon: Hash },
  { value: "select", label: "Select", icon: ListChecks },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare },
  { value: "date", label: "Date", icon: CalendarDays },
  { value: "textarea", label: "Rich Text", icon: AlignLeft },
  { value: "multiselect", label: "Multi-Select", icon: ListChecks },
] as const;

type FieldType = (typeof FIELD_TYPES)[number]["value"];

interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string[];
  helpText: string;
}

interface FormBuilderProps {
  /** Called after successful template creation */
  onSuccess?: () => void;
}

/**
 * FormBuilder renders a visual form designer for creating form templates.
 *
 * @description Provides a drag-and-drop-style field list with field type palette,
 * field properties panel (label, required, validation, help text), and a live
 * preview. Uses tRPC form.createTemplate mutation.
 *
 * @param props - FormBuilderProps
 * @returns Form builder component
 */
export function FormBuilder({ onSuccess }: FormBuilderProps) {
  const t = useTranslations("forms");
  const tc = useTranslations("common");

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const createMutation = trpc.form.createTemplate.useMutation({
    onSuccess: () => onSuccess?.(),
  });

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  const addField = useCallback((type: FieldType) => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      label: `New ${type} field`,
      type,
      required: false,
      options: type === "select" || type === "multiselect" ? ["Option 1", "Option 2"] : [],
      helpText: "",
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
  }, []);

  const removeField = useCallback(
    (id: string) => {
      setFields((prev) => prev.filter((f) => f.id !== id));
      if (selectedFieldId === id) setSelectedFieldId(null);
    },
    [selectedFieldId],
  );

  const updateField = useCallback(
    (id: string, updates: Partial<FormField>) => {
      setFields((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      );
    },
    [],
  );

  const moveField = useCallback((id: string, direction: -1 | 1) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const newFields = [...prev];
      [newFields[idx], newFields[newIdx]] = [newFields[newIdx]!, newFields[idx]!];
      return newFields;
    });
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (fields.length === 0 || !formName) return;

      createMutation.mutate({
        name: formName,
        description: formDescription || undefined,
        schema: fields.map((f) => ({
          id: f.id,
          label: f.label,
          type: f.type,
          required: f.required,
          options: f.options.length > 0 ? f.options : undefined,
        })),
        isActive: true,
      });
    },
    [formName, formDescription, fields, createMutation],
  );

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main area */}
        <div className="space-y-6">
          {/* Form header */}
          <Card>
            <CardHeader>
              <CardTitle>{t("createForm")}</CardTitle>
              <CardDescription>
                Design your form by adding and configuring fields.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="form-name">Form Name</Label>
                <Input
                  id="form-name"
                  placeholder="e.g., Bug Report Template"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  aria-required="true"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="form-desc">Description</Label>
                <Textarea
                  id="form-desc"
                  placeholder="Describe the form purpose..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Field type palette */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {FIELD_TYPES.map((ft) => {
                  const Icon = ft.icon;
                  return (
                    <Button
                      key={ft.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addField(ft.value)}
                    >
                      <Icon className="mr-1 size-3.5" aria-hidden="true" />
                      {ft.label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Field list */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Fields</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="mr-1 size-3.5" aria-hidden="true" />
                  {showPreview ? "Edit" : "Preview"}
                </Button>
              </div>
              <CardDescription>
                {tc("itemCount", { count: fields.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showPreview ? (
                <FormPreview fields={fields} />
              ) : fields.length === 0 ? (
                <div className="flex min-h-[120px] items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/20 text-sm text-muted-foreground">
                  Add fields using the palette above
                </div>
              ) : (
                <div className="space-y-2" role="list" aria-label="Form fields">
                  {fields.map((field) => (
                    <div
                      key={field.id}
                      role="listitem"
                      className={cn(
                        "flex items-center gap-2 rounded-md border p-3 transition-colors",
                        selectedFieldId === field.id && "border-primary bg-primary/5",
                      )}
                    >
                      <div className="flex shrink-0 flex-col">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => moveField(field.id, -1)}
                          aria-label={`Move ${field.label} up`}
                          className="size-4"
                        >
                          <ChevronUp className="size-3" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => moveField(field.id, 1)}
                          aria-label={`Move ${field.label} down`}
                          className="size-4"
                        >
                          <ChevronDown className="size-3" aria-hidden="true" />
                        </Button>
                      </div>
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-2 text-left"
                        onClick={() => setSelectedFieldId(field.id)}
                      >
                        <Badge variant="secondary" className="shrink-0">
                          {field.type}
                        </Badge>
                        <span className="text-sm font-medium">{field.label}</span>
                        {field.required && (
                          <Badge variant="outline" className="text-xs">
                            {tc("required")}
                          </Badge>
                        )}
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeField(field.id)}
                        aria-label={`Remove ${field.label}`}
                      >
                        <Trash2 className="size-3" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button type="button" variant="outline">
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !formName || fields.length === 0}
              >
                {createMutation.isPending ? (
                  tc("loading")
                ) : (
                  <>
                    <Save className="mr-2 size-4" aria-hidden="true" />
                    {tc("save")}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Properties panel */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Field Properties</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedField ? (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="field-label">Label</Label>
                    <Input
                      id="field-label"
                      value={selectedField.label}
                      onChange={(e) =>
                        updateField(selectedField.id, { label: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="field-type">Type</Label>
                    <Select
                      value={selectedField.type}
                      onValueChange={(val) =>
                        updateField(selectedField.id, { type: val as FieldType })
                      }
                    >
                      <SelectTrigger id="field-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((ft) => (
                          <SelectItem key={ft.value} value={ft.value}>
                            {ft.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="field-required">{tc("required")}</Label>
                    <Switch
                      id="field-required"
                      checked={selectedField.required}
                      onCheckedChange={(checked) =>
                        updateField(selectedField.id, { required: checked })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="field-help">Help Text</Label>
                    <Input
                      id="field-help"
                      placeholder="Optional help text"
                      value={selectedField.helpText}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          helpText: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Options for select/multiselect */}
                  {(selectedField.type === "select" ||
                    selectedField.type === "multiselect") && (
                    <div className="space-y-2">
                      <Label>Options</Label>
                      {selectedField.options.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...selectedField.options];
                              newOpts[idx] = e.target.value;
                              updateField(selectedField.id, {
                                options: newOpts,
                              });
                            }}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => {
                              updateField(selectedField.id, {
                                options: selectedField.options.filter(
                                  (_, i) => i !== idx,
                                ),
                              });
                            }}
                            aria-label="Remove option"
                          >
                            <Trash2 className="size-3" aria-hidden="true" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          updateField(selectedField.id, {
                            options: [
                              ...selectedField.options,
                              `Option ${selectedField.options.length + 1}`,
                            ],
                          })
                        }
                      >
                        <Plus className="mr-1 size-3.5" aria-hidden="true" />
                        Add Option
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a field to edit its properties.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

/**
 * FormPreview renders a live preview of the form fields.
 */
function FormPreview({ fields }: { fields: FormField[] }) {
  if (fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No fields to preview.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-md border p-4">
      {fields.map((field) => (
        <div key={field.id} className="grid gap-1.5">
          <Label>
            {field.label}
            {field.required && (
              <span className="text-destructive ms-1">*</span>
            )}
          </Label>
          {field.type === "text" && (
            <Input placeholder={field.helpText || field.label} disabled />
          )}
          {field.type === "number" && (
            <Input type="number" placeholder="0" disabled />
          )}
          {field.type === "textarea" && (
            <Textarea placeholder={field.helpText || field.label} rows={3} disabled />
          )}
          {field.type === "date" && (
            <Input type="date" disabled />
          )}
          {field.type === "checkbox" && (
            <div className="flex items-center gap-2">
              <Checkbox disabled />
              <span className="text-sm text-muted-foreground">{field.label}</span>
            </div>
          )}
          {(field.type === "select" || field.type === "multiselect") && (
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label}`} />
              </SelectTrigger>
            </Select>
          )}
          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      ))}
    </div>
  );
}
