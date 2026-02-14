"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AppHeader } from "@/shared/components/app-header";
import { IssueDetail } from "@/modules/issues/components/IssueDetail";
import { trpc } from "@/shared/lib/trpc";

/**
 * Issue detail page that displays the full issue view.
 *
 * @description Wraps the IssueDetail component with the app header
 * and breadcrumbs. Extracts the issue key from route params and
 * passes it to the IssueDetail component for data fetching.
 */
export default function IssueDetailPage() {
  const params = useParams<{ id: string }>();
  const tn = useTranslations("nav");

  // Pre-fetch the issue to show key in breadcrumb
  const { data: issue } = trpc.issue.getByKey.useQuery(
    { key: params.id },
    { enabled: !!params.id },
  );

  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: tn("issues"), href: "/issues" },
          { label: issue?.key ?? params.id },
        ]}
      />
      <IssueDetail issueKey={params.id} />
    </>
  );
}
