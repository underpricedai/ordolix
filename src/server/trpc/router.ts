import { createRouter } from "./init";
import { projectRouter } from "@/modules/projects/server/project-router";
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
import { integrationRouter } from "@/modules/integrations/server/integration-router";
import { queueRouter } from "@/modules/queues/server/queue-router";
import { sprintRouter } from "@/modules/sprints/server/sprint-router";
import { customFieldRouter } from "@/modules/custom-fields/server/custom-field-router";
import { searchRouter } from "@/modules/search/server/search-router";
import { userRouter } from "@/modules/users/server/user-router";
import { adminRouter } from "@/modules/admin/server/admin-router";
import { permissionRouter } from "@/modules/permissions/server/permission-router";
import { planRouter } from "@/modules/plans/server/plan-router";
import { structureRouter } from "@/modules/structure/server/structure-router";
import { budgetRouter } from "@/modules/budgets/server/budget-router";
import { capacityRouter } from "@/modules/capacity/server/capacity-router";

export const appRouter = createRouter({
  project: projectRouter,
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
  integration: integrationRouter,
  queue: queueRouter,
  sprint: sprintRouter,
  customField: customFieldRouter,
  search: searchRouter,
  user: userRouter,
  admin: adminRouter,
  permission: permissionRouter,
  plan: planRouter,
  structure: structureRouter,
  budget: budgetRouter,
  capacity: capacityRouter,
});

export type AppRouter = typeof appRouter;
