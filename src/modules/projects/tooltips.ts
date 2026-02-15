/**
 * Tooltip content dictionary for the Projects module.
 * @module projects-tooltips
 */

const tooltips = {
  createProject: "Set up a new project with its own board and settings",
  projectKey: "A short prefix used in issue keys (e.g., PROJ-123)",
  projectLead: "The person accountable for this project's delivery",
  projectCategory: "Group related projects under a shared category",
  archiveProject: "Hide this project from views without deleting data",
  projectPermissions: "Control who can view, create, and edit issues",
} as const;

export default tooltips;
