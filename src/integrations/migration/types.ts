/**
 * Jira Cloud Migration Toolkit types.
 * Supports importing data from Jira Cloud REST API or JSON export.
 */

export interface JiraInstance {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  lead: { accountId: string; displayName: string };
}

export interface JiraIssueType {
  id: string;
  name: string;
  subtask: boolean;
  iconUrl: string;
}

export interface JiraStatus {
  id: string;
  name: string;
  statusCategory: { key: string; name: string };
}

export interface JiraPriority {
  id: string;
  name: string;
  iconUrl: string;
}

export interface JiraResolution {
  id: string;
  name: string;
  description: string;
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
  active: boolean;
  avatarUrls: Record<string, string>;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description: string | null;
    issuetype: JiraIssueType;
    status: JiraStatus;
    priority: JiraPriority;
    resolution: JiraResolution | null;
    assignee: JiraUser | null;
    reporter: JiraUser | null;
    created: string;
    updated: string;
    resolutiondate: string | null;
    duedate: string | null;
    labels: string[];
    components: Array<{ id: string; name: string }>;
    fixVersions: Array<{ id: string; name: string }>;
    parent?: { id: string; key: string };
    subtasks: Array<{ id: string; key: string }>;
    comment: { comments: JiraComment[] };
    attachment: JiraAttachment[];
    worklog: { worklogs: JiraWorklog[] };
    issuelinks: JiraIssueLink[];
    [key: string]: unknown;
  };
}

export interface JiraComment {
  id: string;
  author: JiraUser;
  body: string;
  created: string;
  updated: string;
}

export interface JiraAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  content: string; // URL
  created: string;
  author: JiraUser;
}

export interface JiraWorklog {
  id: string;
  author: JiraUser;
  timeSpentSeconds: number;
  started: string;
  comment: string | null;
}

export interface JiraIssueLink {
  id: string;
  type: { name: string; inward: string; outward: string };
  inwardIssue?: { id: string; key: string };
  outwardIssue?: { id: string; key: string };
}

export interface MigrationConfig {
  source: JiraInstance;
  targetOrganizationId: string;
  projectKeys: string[];
  options: {
    includeAttachments: boolean;
    includeWorklogs: boolean;
    includeComments: boolean;
    includeHistory: boolean;
    mapUsers: boolean;
    dryRun: boolean;
  };
}

export interface MigrationProgress {
  status: "pending" | "running" | "completed" | "failed";
  phase: string;
  total: number;
  processed: number;
  errors: MigrationError[];
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface MigrationError {
  entity: string;
  entityId: string;
  message: string;
  timestamp: Date;
}

export interface UserMapping {
  jiraAccountId: string;
  jiraDisplayName: string;
  ordolixUserId: string | null;
  ordolixEmail: string | null;
}

export interface MigrationResult {
  projectsMigrated: number;
  issuesMigrated: number;
  commentsMigrated: number;
  attachmentsMigrated: number;
  worklogsMigrated: number;
  errors: MigrationError[];
  duration: number;
  userMappings: UserMapping[];
}
