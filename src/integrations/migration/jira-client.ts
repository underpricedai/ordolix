import { IntegrationError } from "@/server/lib/errors";
import type {
  JiraInstance,
  JiraProject,
  JiraIssue,
  JiraUser,
  JiraIssueType,
  JiraStatus,
  JiraPriority,
  JiraResolution,
} from "./types";

/**
 * Jira Cloud REST API client for migration.
 * Uses basic auth (email + API token).
 */
export class JiraClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(instance: JiraInstance) {
    this.baseUrl = instance.baseUrl.replace(/\/$/, "");
    this.authHeader =
      "Basic " +
      Buffer.from(`${instance.email}:${instance.apiToken}`).toString("base64");
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}/rest/api/3${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new IntegrationError(
        "Jira",
        `API error ${response.status}: ${body}`,
        { url, status: response.status },
      );
    }

    return response.json() as Promise<T>;
  }

  async getServerInfo(): Promise<{ version: string; baseUrl: string }> {
    return this.request("/serverInfo");
  }

  async getProjects(): Promise<JiraProject[]> {
    return this.request("/project");
  }

  async getProject(keyOrId: string): Promise<JiraProject> {
    return this.request(`/project/${keyOrId}`);
  }

  async getIssueTypes(): Promise<JiraIssueType[]> {
    return this.request("/issuetype");
  }

  async getStatuses(): Promise<JiraStatus[]> {
    return this.request("/status");
  }

  async getPriorities(): Promise<JiraPriority[]> {
    return this.request("/priority");
  }

  async getResolutions(): Promise<JiraResolution[]> {
    return this.request("/resolution");
  }

  async getUsers(maxResults = 1000): Promise<JiraUser[]> {
    return this.request(`/users/search?maxResults=${maxResults}`);
  }

  /**
   * Search issues using JQL with pagination.
   */
  async searchIssues(
    jql: string,
    startAt = 0,
    maxResults = 100,
  ): Promise<{ total: number; issues: JiraIssue[] }> {
    return this.request("/search", {
      method: "POST",
      body: JSON.stringify({
        jql,
        startAt,
        maxResults,
        fields: [
          "summary",
          "description",
          "issuetype",
          "status",
          "priority",
          "resolution",
          "assignee",
          "reporter",
          "created",
          "updated",
          "resolutiondate",
          "duedate",
          "labels",
          "components",
          "fixVersions",
          "parent",
          "subtasks",
          "comment",
          "attachment",
          "worklog",
          "issuelinks",
        ],
      }),
    });
  }

  /**
   * Get all issues for a project, handling pagination.
   */
  async getAllProjectIssues(
    projectKey: string,
    onProgress?: (processed: number, total: number) => void,
  ): Promise<JiraIssue[]> {
    const jql = `project = "${projectKey}" ORDER BY created ASC`;
    const allIssues: JiraIssue[] = [];
    let startAt = 0;
    const maxResults = 100;

    const first = await this.searchIssues(jql, 0, maxResults);
    allIssues.push(...first.issues);
    const total = first.total;

    onProgress?.(allIssues.length, total);

    while (allIssues.length < total) {
      startAt += maxResults;
      const batch = await this.searchIssues(jql, startAt, maxResults);
      allIssues.push(...batch.issues);
      onProgress?.(allIssues.length, total);
    }

    return allIssues;
  }

  /**
   * Download an attachment file.
   */
  async downloadAttachment(url: string): Promise<ReadableStream> {
    const response = await fetch(url, {
      headers: {
        Authorization: this.authHeader,
      },
    });

    if (!response.ok || !response.body) {
      throw new IntegrationError("Jira", `Failed to download attachment: ${url}`);
    }

    return response.body;
  }
}
