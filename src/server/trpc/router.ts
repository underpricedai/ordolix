import { createRouter } from "./init";
import { issueRouter } from "@/modules/issues/server/issue-router";
import { workflowRouter } from "@/modules/workflows/server/workflow-router";
import { boardRouter } from "@/modules/boards/server/board-router";
import { timeTrackingRouter } from "@/modules/time-tracking/server/time-tracking-router";
import { checklistRouter } from "@/modules/checklists/server/checklist-router";
import { epicRollupRouter } from "@/modules/issues/server/epic-rollup-router";
import { ganttRouter } from "@/modules/gantt/server/gantt-router";
import { dashboardRouter } from "@/modules/dashboards/server/dashboard-router";
import { approvalRouter } from "@/modules/approvals/server/approval-router";
import { scriptRouter } from "@/modules/scripts/server/script-router";
import { notificationRouter } from "@/modules/notifications/server/notification-router";
import { retroRouter } from "@/modules/retrospectives/server/retro-router";
import { testManagementRouter } from "@/modules/test-management/server/test-management-router";
import { slaRouter } from "@/modules/sla/server/sla-router";
import { automationRouter } from "@/modules/automation/server/automation-router";
import { formRouter } from "@/modules/forms/server/form-router";
import { reportRouter } from "@/modules/reports/server/report-router";
import { assetRouter } from "@/modules/assets/server/asset-router";
import { incidentRouter } from "@/modules/incidents/server/incident-router";

export const appRouter = createRouter({
  issue: issueRouter,
  workflow: workflowRouter,
  board: boardRouter,
  timeTracking: timeTrackingRouter,
  checklist: checklistRouter,
  epicRollup: epicRollupRouter,
  gantt: ganttRouter,
  dashboard: dashboardRouter,
  approval: approvalRouter,
  script: scriptRouter,
  notification: notificationRouter,
  retro: retroRouter,
  testManagement: testManagementRouter,
  sla: slaRouter,
  automation: automationRouter,
  form: formRouter,
  report: reportRouter,
  asset: assetRouter,
  incident: incidentRouter,
});

export type AppRouter = typeof appRouter;
