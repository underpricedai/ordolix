"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Clock, CalendarDays } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import { cn } from "@/shared/lib/utils";
import { trpc } from "@/shared/lib/trpc";

/**
 * Work categories available for time log entries.
 */
const WORK_CATEGORIES = [
  "development",
  "testing",
  "review",
  "meeting",
  "documentation",
  "design",
  "devops",
  "support",
  "other",
] as const;

type WorkCategory = (typeof WORK_CATEGORIES)[number];

interface TimeLogFormProps {
  /** Optional pre-selected issue ID */
  issueId?: string;
  /** Called after successful log */
  onSuccess?: () => void;
}

/**
 * TimeLogForm renders a dialog for logging time against an issue.
 *
 * @description Provides duration input (hours:minutes), date picker, description,
 * issue picker, and work category selector. Submits via tRPC timeTracking.log mutation.
 *
 * @param props - TimeLogFormProps
 * @returns Dialog component for logging time
 */
export function TimeLogForm({ issueId: defaultIssueId, onSuccess }: TimeLogFormProps) {
  const t = useTranslations("timeTracking");
  const tc = useTranslations("common");

  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [description, setDescription] = useState("");
  const [issueId, setIssueId] = useState(defaultIssueId ?? "");
  const [category, setCategory] = useState<WorkCategory>("development");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const logTimeMutation = trpc.timeTracking.log.useMutation({
    onSuccess: () => {
      resetForm();
      setOpen(false);
      onSuccess?.();
    },
  });

  const resetForm = useCallback(() => {
    setHours("");
    setMinutes("");
    setDate(new Date());
    setDescription("");
    setIssueId(defaultIssueId ?? "");
    setCategory("development");
  }, [defaultIssueId]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const totalMinutes =
        (parseInt(hours || "0", 10) * 60) + parseInt(minutes || "0", 10);

      if (totalMinutes <= 0 || !issueId) return;

      logTimeMutation.mutate({
        issueId,
        date,
        duration: totalMinutes,
        description: description || undefined,
        billable: true,
      });
    },
    [hours, minutes, date, description, issueId, logTimeMutation],
  );

  const formattedDate = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(date);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Clock className="mr-2 size-4" aria-hidden="true" />
          {t("logTime")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("logTime")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Issue picker */}
            <div className="grid gap-2">
              <Label htmlFor="tl-issue">{tc("details")}</Label>
              <Input
                id="tl-issue"
                placeholder="PROJ-123"
                value={issueId}
                onChange={(e) => setIssueId(e.target.value)}
                required
                aria-required="true"
              />
            </div>

            {/* Duration inputs */}
            <div className="grid gap-2">
              <Label>{t("timeSpent")}</Label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Input
                    id="tl-hours"
                    type="number"
                    min={0}
                    max={23}
                    placeholder="0"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="w-20"
                    aria-label="Hours"
                  />
                  <span className="text-sm text-muted-foreground">h</span>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    id="tl-minutes"
                    type="number"
                    min={0}
                    max={59}
                    placeholder="0"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="w-20"
                    aria-label="Minutes"
                  />
                  <span className="text-sm text-muted-foreground">m</span>
                </div>
              </div>
            </div>

            {/* Date picker */}
            <div className="grid gap-2">
              <Label>{t("startDate")}</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarDays className="mr-2 size-4" aria-hidden="true" />
                    {formattedDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      if (d) {
                        setDate(d);
                        setDatePickerOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Work category */}
            <div className="grid gap-2">
              <Label htmlFor="tl-category">Category</Label>
              <Select
                value={category}
                onValueChange={(val) => setCategory(val as WorkCategory)}
              >
                <SelectTrigger id="tl-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="tl-description">{t("description")}</Label>
              <Textarea
                id="tl-description"
                placeholder={t("description")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {tc("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={logTimeMutation.isPending}
            >
              {logTimeMutation.isPending ? tc("loading") : t("logTime")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
