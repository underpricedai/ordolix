import { createRouter } from "./init";

export const appRouter = createRouter({
  // Module routers will be added here during feature development
  // e.g. issue: issueRouter,
  //      workflow: workflowRouter,
});

export type AppRouter = typeof appRouter;
