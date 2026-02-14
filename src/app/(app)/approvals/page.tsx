"use client";

import { useTranslations } from "next-intl";
import { AppHeader } from "@/shared/components/app-header";
import { ApprovalList } from "@/modules/approvals/components/ApprovalList";

/**
 * Approvals page showing pending approval requests.
 *
 * @description Lists all pending approvals for the current user with
 * approve/reject actions and comment support.
 */
export default function ApprovalsPage() {
  const tn = useTranslations("nav");

  return (
    <>
      <AppHeader breadcrumbs={[{ label: tn("approvals") }]} />
      <div className="flex-1 space-y-4 p-6">
        <ApprovalList />
      </div>
    </>
  );
}
