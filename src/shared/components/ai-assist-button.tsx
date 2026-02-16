/**
 * AI assist dropdown button component.
 *
 * Renders a compact button with AI-powered actions for issues.
 * Can be placed next to issue fields to provide AI assistance
 * such as summarization, label suggestions, description generation,
 * and related issue discovery.
 *
 * @module shared/components/ai-assist-button
 */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { trpc } from "@/shared/lib/trpc";

/** Props for the AIAssistButton component. */
interface AIAssistButtonProps {
  /** The issue ID to perform AI actions on. Required for summarize, suggestLabels, and findRelated. */
  issueId?: string;
  /** Callback invoked with the AI-generated summary text. */
  onSummary?: (text: string) => void;
  /** Callback invoked with suggested label strings. */
  onLabels?: (labels: string[]) => void;
  /** Callback invoked with the AI-generated description text. */
  onDescription?: (text: string) => void;
  /** Summary text for generating descriptions (used when issueId is not set). */
  summary?: string;
  /** Issue type for generating descriptions. */
  issueType?: string;
}

/**
 * Dropdown button that provides AI-powered actions for issues.
 *
 * Checks AI availability on mount. If the API is not configured,
 * shows a tooltip explaining that configuration is needed.
 *
 * @example
 * ```tsx
 * <AIAssistButton
 *   issueId="issue-123"
 *   onSummary={(text) => setSummary(text)}
 *   onLabels={(labels) => setLabels(labels)}
 * />
 * ```
 */
export function AIAssistButton({
  issueId,
  onSummary,
  onLabels,
  onDescription,
  summary,
  issueType,
}: AIAssistButtonProps) {
  const t = useTranslations("ai");
  const [loading, setLoading] = useState(false);

  const statusQuery = trpc.ai.status.useQuery(undefined, {
    staleTime: 60_000,
  });

  const summarizeMutation = trpc.ai.summarize.useMutation();
  const suggestLabelsMutation = trpc.ai.suggestLabels.useMutation();
  const generateDescriptionMutation = trpc.ai.generateDescription.useMutation();

  const isAvailable = statusQuery.data?.available ?? false;

  /** Handle the summarize action. */
  async function handleSummarize() {
    if (!issueId || !onSummary) return;
    setLoading(true);
    try {
      const result = await summarizeMutation.mutateAsync({ issueId });
      if (result.summary) {
        onSummary(result.summary);
      }
    } finally {
      setLoading(false);
    }
  }

  /** Handle the suggest labels action. */
  async function handleSuggestLabels() {
    if (!issueId || !onLabels) return;
    setLoading(true);
    try {
      const result = await suggestLabelsMutation.mutateAsync({ issueId });
      if (result.labels.length > 0) {
        onLabels(result.labels);
      }
    } finally {
      setLoading(false);
    }
  }

  /** Handle the generate description action. */
  async function handleGenerateDescription() {
    if (!onDescription || !summary || !issueType) return;
    setLoading(true);
    try {
      const result = await generateDescriptionMutation.mutateAsync({
        summary,
        issueType,
      });
      if (result.description) {
        onDescription(result.description);
      }
    } finally {
      setLoading(false);
    }
  }

  // If AI is not available, render a disabled button with tooltip
  if (!isAvailable) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled
            aria-label={t("notAvailable")}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("notAvailable")}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Show spinner when an action is in progress
  if (loading) {
    return (
      <Button variant="ghost" size="icon" disabled aria-label={t("processing")}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  const hasActions =
    (issueId && onSummary) ||
    (issueId && onLabels) ||
    (onDescription && summary && issueType);

  if (!hasActions) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("summarize")}
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {issueId && onSummary && (
          <DropdownMenuItem onSelect={handleSummarize}>
            {t("summarize")}
          </DropdownMenuItem>
        )}
        {issueId && onLabels && (
          <DropdownMenuItem onSelect={handleSuggestLabels}>
            {t("suggestLabels")}
          </DropdownMenuItem>
        )}
        {onDescription && summary && issueType && (
          <DropdownMenuItem onSelect={handleGenerateDescription}>
            {t("generateDescription")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
