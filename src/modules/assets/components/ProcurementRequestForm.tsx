"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/shared/components/responsive-dialog";
import { trpc } from "@/shared/lib/trpc";
import { PROCUREMENT_URGENCIES } from "../types/schemas";

interface ProcurementRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * ProcurementRequestForm renders a create form in a ResponsiveDialog
 * for procurement request management.
 *
 * @param props - ProcurementRequestFormProps
 * @returns The procurement request form dialog component
 */
export function ProcurementRequestForm({
  open,
  onOpenChange,
  onSuccess,
}: ProcurementRequestFormProps) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [costCenter, setCostCenter] = useState("");
  const [urgency, setUrgency] = useState<string>("normal");

  const { data: vendors } = trpc.vendor.listVendors.useQuery(
    { isActive: true, limit: 100 },
  );

  const createMutation = trpc.procurement.createProcurementRequest.useMutation({
    onSuccess: () => {
      utils.procurement.listProcurementRequests.invalidate();
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
  });

  function resetForm() {
    setTitle("");
    setDescription("");
    setVendorId("");
    setEstimatedCost("");
    setQuantity("1");
    setCostCenter("");
    setUrgency("normal");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      title,
      description: description || null,
      vendorId: vendorId || null,
      estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
      quantity: parseInt(quantity, 10) || 1,
      costCenter: costCenter || null,
      urgency: urgency as typeof PROCUREMENT_URGENCIES[number],
    });
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t("procurement_create_request")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("procurement_create_request_description")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="proc-title">{tc("name")}</Label>
            <Input
              id="proc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("procurement_title_placeholder")}
              required
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proc-description">{t("procurement_description")}</Label>
            <Textarea
              id="proc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("procurement_description_placeholder")}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="proc-vendor">{t("procurement_vendor")}</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger id="proc-vendor">
                  <SelectValue placeholder={t("procurement_select_vendor")} />
                </SelectTrigger>
                <SelectContent>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(vendors as any[])?.map((v: { id: string; name: string }) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proc-urgency">{t("procurement_urgency")}</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger id="proc-urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROCUREMENT_URGENCIES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {t(`urgency_${u}` as Parameters<typeof t>[0])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="proc-cost">{t("procurement_estimated_cost")}</Label>
              <Input
                id="proc-cost"
                type="number"
                min={0}
                step="0.01"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proc-qty">{t("procurement_quantity")}</Label>
              <Input
                id="proc-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proc-cc">{t("cost_center")}</Label>
              <Input
                id="proc-cc"
                value={costCenter}
                onChange={(e) => setCostCenter(e.target.value)}
                placeholder={t("cost_center_placeholder")}
              />
            </div>
          </div>

          <ResponsiveDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !title}>
              {createMutation.isPending ? tc("loading") : tc("save")}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
