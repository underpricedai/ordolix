"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { IncidentList } from "@/modules/incidents/components/IncidentList";
import { IncidentDetail } from "@/modules/incidents/components/IncidentDetail";
import { trpc } from "@/shared/lib/trpc";

/**
 * Incidents page with list and detail views.
 *
 * @description Displays an incident tracker table by default. Clicking an
 * incident navigates to its full detail view with timeline, linked issues,
 * and editable root cause / resolution fields. The create button opens a
 * dialog that creates an incident linked to an existing issue.
 */
export default function IncidentsPage() {
  const t = useTranslations("incidents");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    null,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [issueId, setIssueId] = useState("");
  const [severity, setSeverity] = useState<string>("P1");

  const utils = trpc.useUtils();

  const createMutation = trpc.incident.create.useMutation({
    onSuccess: async (data) => {
      setCreateOpen(false);
      setIssueId("");
      setSeverity("P1");
      await utils.incident.list.invalidate();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newIncident = data as any;
      if (newIncident?.id) {
        setSelectedIncidentId(newIncident.id);
      }
    },
  });

  const handleCreate = () => {
    if (!issueId.trim()) return;
    createMutation.mutate({
      issueId: issueId.trim(),
      severity: severity as "P1" | "P2" | "P3" | "P4",
    });
  };

  const createButton = (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" aria-hidden="true" />
          {t("createIncident")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createIncident")}</DialogTitle>
          <DialogDescription>{t("createIncidentDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="incident-issue-id">{t("issueId")}</Label>
            <Input
              id="incident-issue-id"
              value={issueId}
              onChange={(e) => setIssueId(e.target.value)}
              placeholder={t("issueIdPlaceholder")}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("severity")}</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger aria-label={t("severity")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="P1">{t("severityP1")}</SelectItem>
                <SelectItem value="P2">{t("severityP2")}</SelectItem>
                <SelectItem value="P3">{t("severityP3")}</SelectItem>
                <SelectItem value="P4">{t("severityP4")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateOpen(false)}>
            {tc("cancel")}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!issueId.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? tc("saving") : tc("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <AppHeader
        breadcrumbs={[
          {
            label: tn("incidents"),
            href: selectedIncidentId ? "/incidents" : undefined,
          },
          ...(selectedIncidentId ? [{ label: tc("details") }] : []),
        ]}
      />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {selectedIncidentId ? (
          <IncidentDetail
            incidentId={selectedIncidentId}
            onBack={() => setSelectedIncidentId(null)}
          />
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {t("title")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t("pageDescription")}
                </p>
              </div>
              {createButton}
            </div>
            <IncidentList onSelectIncident={setSelectedIncidentId} />
          </>
        )}
      </div>
    </>
  );
}
