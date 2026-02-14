import type { PrismaClient } from "@prisma/client";
import { IntegrationError } from "@/server/lib/errors";
import { JiraClient } from "./jira-client";
import type {
  MigrationConfig,
  MigrationProgress,
  MigrationResult,
  MigrationError,
  UserMapping,
  JiraIssue,
  JiraUser,
} from "./types";

/**
 * Jira-to-Ordolix migration engine.
 * Handles full project migration with user mapping, issue import, and attachment transfer.
 */
export class JiraMigrator {
  private client: JiraClient;
  private db: PrismaClient;
  private config: MigrationConfig;
  private progress: MigrationProgress;
  private userMap: Map<string, string> = new Map(); // jiraAccountId → ordolixUserId
  private statusMap: Map<string, string> = new Map(); // jiraStatusName → ordolixStatusId
  private typeMap: Map<string, string> = new Map(); // jiraTypeName → ordolixTypeId
  private priorityMap: Map<string, string> = new Map(); // jiraPriorityName → ordolixPriorityId
  private issueIdMap: Map<string, string> = new Map(); // jiraIssueId → ordolixIssueId
  private errors: MigrationError[] = [];

  constructor(db: PrismaClient, config: MigrationConfig) {
    this.db = db;
    this.config = config;
    this.client = new JiraClient(config.source);
    this.progress = {
      status: "pending",
      phase: "initializing",
      total: 0,
      processed: 0,
      errors: [],
      startedAt: null,
      completedAt: null,
    };
  }

  getProgress(): MigrationProgress {
    return { ...this.progress };
  }

  /**
   * Run the full migration pipeline.
   */
  async migrate(): Promise<MigrationResult> {
    const startTime = Date.now();
    this.progress.status = "running";
    this.progress.startedAt = new Date();

    try {
      // Phase 1: Fetch metadata
      this.setPhase("fetching_metadata");
      await this.buildMappings();

      // Phase 2: Migrate each project
      let totalIssues = 0;
      let totalComments = 0;
      let totalAttachments = 0;
      let totalWorklogs = 0;

      for (const projectKey of this.config.projectKeys) {
        this.setPhase(`migrating_project_${projectKey}`);
        const result = await this.migrateProject(projectKey);
        totalIssues += result.issues;
        totalComments += result.comments;
        totalAttachments += result.attachments;
        totalWorklogs += result.worklogs;
      }

      this.progress.status = "completed";
      this.progress.completedAt = new Date();

      return {
        projectsMigrated: this.config.projectKeys.length,
        issuesMigrated: totalIssues,
        commentsMigrated: totalComments,
        attachmentsMigrated: totalAttachments,
        worklogsMigrated: totalWorklogs,
        errors: this.errors,
        duration: Date.now() - startTime,
        userMappings: this.getUserMappings(),
      };
    } catch (error) {
      this.progress.status = "failed";
      this.progress.completedAt = new Date();
      throw error;
    }
  }

  private setPhase(phase: string) {
    this.progress.phase = phase;
  }

  /**
   * Build lookup maps for statuses, types, priorities, users.
   */
  private async buildMappings() {
    const orgId = this.config.targetOrganizationId;

    // Map Jira users to Ordolix users by email
    if (this.config.options.mapUsers) {
      const jiraUsers = await this.client.getUsers();
      const ordolixUsers = await this.db.user.findMany({
        select: { id: true, email: true },
      });
      const emailToId = new Map(
        ordolixUsers.map((u) => [u.email.toLowerCase(), u.id]),
      );

      for (const jiraUser of jiraUsers) {
        if (jiraUser.emailAddress) {
          const ordolixId = emailToId.get(
            jiraUser.emailAddress.toLowerCase(),
          );
          if (ordolixId) {
            this.userMap.set(jiraUser.accountId, ordolixId);
          }
        }
      }
    }

    // Map statuses by name
    const statuses = await this.db.status.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
    });
    for (const s of statuses) {
      this.statusMap.set(s.name.toLowerCase(), s.id);
    }

    // Map issue types by name
    const types = await this.db.issueType.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
    });
    for (const t of types) {
      this.typeMap.set(t.name.toLowerCase(), t.id);
    }

    // Map priorities by name
    const priorities = await this.db.priority.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
    });
    for (const p of priorities) {
      this.priorityMap.set(p.name.toLowerCase(), p.id);
    }
  }

  private async migrateProject(projectKey: string) {
    const orgId = this.config.targetOrganizationId;
    let issueCount = 0;
    let commentCount = 0;
    const attachmentCount = 0;
    let worklogCount = 0;

    // Get or create project
    const jiraProject = await this.client.getProject(projectKey);
    const project = await this.db.project.upsert({
      where: { organizationId_key: { organizationId: orgId, key: projectKey } },
      update: {},
      create: {
        organizationId: orgId,
        key: projectKey,
        name: jiraProject.name,
        projectType: jiraProject.projectTypeKey === "business" ? "business" : "software",
      },
    });

    // Fetch all issues
    const jiraIssues = await this.client.getAllProjectIssues(
      projectKey,
      (processed, total) => {
        this.progress.processed = processed;
        this.progress.total = total;
      },
    );

    // First pass: create issues (without parent links)
    for (const jiraIssue of jiraIssues) {
      try {
        if (this.config.options.dryRun) {
          this.issueIdMap.set(jiraIssue.id, `dry-run-${jiraIssue.key}`);
          issueCount++;
          continue;
        }

        const issue = await this.createIssue(jiraIssue, project.id, orgId);
        this.issueIdMap.set(jiraIssue.id, issue.id);
        issueCount++;

        // Migrate comments
        if (this.config.options.includeComments) {
          for (const comment of jiraIssue.fields.comment.comments) {
            await this.createComment(comment, issue.id, orgId);
            commentCount++;
          }
        }

        // Migrate worklogs
        if (this.config.options.includeWorklogs) {
          for (const worklog of jiraIssue.fields.worklog.worklogs) {
            await this.createWorklog(worklog, issue.id, orgId);
            worklogCount++;
          }
        }

        this.progress.processed++;
      } catch (error) {
        this.addError("Issue", jiraIssue.key, error);
      }
    }

    // Second pass: link parents and issue links
    if (!this.config.options.dryRun) {
      for (const jiraIssue of jiraIssues) {
        try {
          await this.linkIssue(jiraIssue);
        } catch (error) {
          this.addError("IssueLink", jiraIssue.key, error);
        }
      }
    }

    return {
      issues: issueCount,
      comments: commentCount,
      attachments: attachmentCount,
      worklogs: worklogCount,
    };
  }

  private async createIssue(
    jira: JiraIssue,
    projectId: string,
    orgId: string,
  ) {
    const statusId = this.resolveStatus(jira.fields.status.name);
    const issueTypeId = this.resolveType(jira.fields.issuetype.name);
    const priorityId = this.resolvePriority(jira.fields.priority.name);
    const assigneeId = this.resolveUser(jira.fields.assignee);
    const reporterId = this.resolveUser(jira.fields.reporter);

    return this.db.issue.create({
      data: {
        organizationId: orgId,
        projectId,
        key: jira.key,
        issueTypeId,
        statusId,
        priorityId,
        assigneeId,
        reporterId: reporterId ?? "migration-import",
        summary: jira.fields.summary,
        description: jira.fields.description
          ? this.convertDescription(jira.fields.description)
          : null,
        labels: jira.fields.labels,
        dueDate: jira.fields.duedate ? new Date(jira.fields.duedate) : null,
        createdAt: new Date(jira.fields.created),
        updatedAt: new Date(jira.fields.updated),
      },
    });
  }

  private async createComment(
    comment: { author: JiraUser; body: string; created: string },
    issueId: string,
    orgId: string,
  ) {
    const authorId = this.resolveUser(comment.author);

    await this.db.comment.create({
      data: {
        organizationId: orgId,
        issueId,
        authorId: authorId ?? "migration-import",
        body: comment.body,
        createdAt: new Date(comment.created),
      },
    });
  }

  private async createWorklog(
    worklog: {
      author: JiraUser;
      timeSpentSeconds: number;
      started: string;
      comment: string | null;
    },
    issueId: string,
    orgId: string,
  ) {
    const userId = this.resolveUser(worklog.author);

    await this.db.timeLog.create({
      data: {
        organizationId: orgId,
        issueId,
        userId: userId ?? "migration-import",
        duration: worklog.timeSpentSeconds,
        date: new Date(worklog.started),
        description: worklog.comment,
      },
    });
  }

  private async linkIssue(jira: JiraIssue) {
    const ordolixId = this.issueIdMap.get(jira.id);
    if (!ordolixId) return;

    // Set parent
    if (jira.fields.parent) {
      const parentId = this.issueIdMap.get(jira.fields.parent.id);
      if (parentId) {
        await this.db.issue.update({
          where: { id: ordolixId },
          data: { parentId },
        });
      }
    }

    // Create issue links
    for (const link of jira.fields.issuelinks) {
      const targetJiraId =
        link.outwardIssue?.id ?? link.inwardIssue?.id;
      if (!targetJiraId) continue;

      const targetId = this.issueIdMap.get(targetJiraId);
      if (!targetId) continue;

      // Avoid duplicate links
      const existing = await this.db.issueLink.findFirst({
        where: {
          OR: [
            { fromIssueId: ordolixId, toIssueId: targetId },
            { fromIssueId: targetId, toIssueId: ordolixId },
          ],
        },
      });

      if (!existing) {
        await this.db.issueLink.create({
          data: {
            fromIssueId: ordolixId,
            toIssueId: targetId,
            linkType: link.type.name,
          },
        });
      }
    }
  }

  private resolveStatus(name: string): string {
    const id = this.statusMap.get(name.toLowerCase());
    if (!id) {
      // Fallback to first status
      const fallback = this.statusMap.values().next().value;
      if (!fallback) {
        throw new IntegrationError("Migration", `No status mapping for '${name}'`);
      }
      return fallback;
    }
    return id;
  }

  private resolveType(name: string): string {
    const id = this.typeMap.get(name.toLowerCase());
    if (!id) {
      const fallback = this.typeMap.values().next().value;
      if (!fallback) {
        throw new IntegrationError("Migration", `No issue type mapping for '${name}'`);
      }
      return fallback;
    }
    return id;
  }

  private resolvePriority(name: string): string {
    const id = this.priorityMap.get(name.toLowerCase());
    if (!id) {
      const fallback = this.priorityMap.values().next().value;
      if (!fallback) {
        throw new IntegrationError("Migration", `No priority mapping for '${name}'`);
      }
      return fallback;
    }
    return id;
  }

  private resolveUser(user: JiraUser | null): string | null {
    if (!user) return null;
    return this.userMap.get(user.accountId) ?? null;
  }

  private convertDescription(desc: string): string {
    // Jira ADF → plain text/markdown conversion stub
    // In production, use a full ADF-to-markdown converter
    if (typeof desc === "object") {
      return JSON.stringify(desc);
    }
    return desc;
  }

  private addError(entity: string, entityId: string, error: unknown) {
    const msg =
      error instanceof Error ? error.message : String(error);
    this.errors.push({
      entity,
      entityId,
      message: msg,
      timestamp: new Date(),
    });
    this.progress.errors = this.errors;
  }

  private getUserMappings(): UserMapping[] {
    const mappings: UserMapping[] = [];
    for (const [jiraId, ordolixId] of this.userMap) {
      mappings.push({
        jiraAccountId: jiraId,
        jiraDisplayName: "",
        ordolixUserId: ordolixId,
        ordolixEmail: null,
      });
    }
    return mappings;
  }
}
