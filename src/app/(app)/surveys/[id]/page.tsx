/**
 * Public survey submission form page.
 *
 * @description Renders the SurveyForm component for a specific template ID.
 * Accepts optional issueId as a query parameter.
 *
 * @module survey-submit
 */
"use client";

import { useSearchParams } from "next/navigation";
import { use } from "react";
import { SurveyForm } from "@/modules/surveys/components/SurveyForm";

interface SurveyPageProps {
  params: Promise<{ id: string }>;
}

export default function SurveyPage({ params }: SurveyPageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const issueId = searchParams.get("issueId") ?? undefined;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <SurveyForm templateId={id} issueId={issueId} />
    </div>
  );
}
