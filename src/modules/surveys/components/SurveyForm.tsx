/**
 * Public-facing survey submission form.
 *
 * @description Renders a survey form with star rating (1-5 stars, clickable),
 * template-defined questions, and a comment box. Supports submission
 * with optimistic UI feedback.
 *
 * @module SurveyForm
 */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { trpc } from "@/shared/lib/trpc";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { StarRating } from "./StarRating";

interface SurveyFormProps {
  /** Template ID to load */
  templateId: string;
  /** Optional issue ID for context */
  issueId?: string;
}

/**
 * SurveyForm renders a public survey submission form.
 *
 * @param props - SurveyFormProps
 * @returns A survey form component
 */
export function SurveyForm({ templateId, issueId }: SurveyFormProps) {
  const t = useTranslations("surveys");
  const tc = useTranslations("common");

  const [starRating, setStarRating] = useState(0);
  const [comment, setComment] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: template, isLoading, error } = trpc.survey.getTemplate.useQuery(
    { id: templateId },
  );

  const submitMutation = trpc.survey.submitResponse.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitMutation.mutate({
      templateId,
      issueId,
      starRating: starRating > 0 ? starRating : undefined,
      answers,
      comment: comment || undefined,
    });
  }

  if (isLoading) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">{tc("loading")}</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="py-12 text-center">
          <p className="text-destructive">{tc("error")}</p>
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <CheckCircle2 className="size-12 text-green-500" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-foreground">
            {t("thankYou")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("responseRecorded")}
          </p>
        </CardContent>
      </Card>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questions = (template?.questions as any[]) ?? [];

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>{template?.name ?? t("survey")}</CardTitle>
        {template?.description && (
          <CardDescription>{template.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>{t("overallRating")}</Label>
            <StarRating
              value={starRating}
              onChange={setStarRating}
              size="lg"
              label={t("overallRating")}
            />
            {starRating > 0 && (
              <p className="text-sm text-muted-foreground">
                {t("ratingSelected", { rating: starRating })}
              </p>
            )}
          </div>

          {/* Dynamic Questions */}
          {questions.map((q: { id: string; type: string; label: string; required?: boolean; options?: string[] }) => (
            <div key={q.id} className="space-y-2">
              <Label htmlFor={`q-${q.id}`}>
                {q.label}
                {q.required && (
                  <span className="ms-1 text-destructive" aria-hidden="true">*</span>
                )}
              </Label>

              {q.type === "text" && (
                <Input
                  id={`q-${q.id}`}
                  value={(answers[q.id] as string) ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                  required={q.required}
                />
              )}

              {q.type === "rating" && (
                <StarRating
                  value={(answers[q.id] as number) ?? 0}
                  onChange={(val) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: val }))
                  }
                  label={q.label}
                />
              )}

              {q.type === "select" && q.options && (
                <select
                  id={`q-${q.id}`}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={(answers[q.id] as string) ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                  required={q.required}
                >
                  <option value="">{t("selectOption")}</option>
                  {q.options.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
            </div>
          ))}

          {/* Comment Box */}
          <div className="space-y-2">
            <Label htmlFor="survey-comment">{t("additionalComments")}</Label>
            <Textarea
              id="survey-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("commentPlaceholder")}
              rows={3}
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? tc("loading") : tc("submit")}
          </Button>

          {submitMutation.error && (
            <p className="text-sm text-destructive" role="alert">
              {submitMutation.error.message}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
