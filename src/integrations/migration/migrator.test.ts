import { describe, expect, it, vi, beforeEach } from "vitest";
import { JiraMigrator } from "./migrator";
import type { MigrationConfig, JiraIssue } from "./types";
import { JiraClient } from "./jira-client";

// Mock JiraClient constructor
vi.mock("./jira-client");

const mockIssue: JiraIssue = {
  id: "10001",
  key: "TEST-1",
  fields: {
    summary: "Test issue",
    description: "Description text",
    issuetype: { id: "1", name: "Task", subtask: false, iconUrl: "" },
    status: {
      id: "1",
      name: "To Do",
      statusCategory: { key: "new", name: "To Do" },
    },
    priority: { id: "3", name: "Medium", iconUrl: "" },
    resolution: null,
    assignee: {
      accountId: "jira-1",
      displayName: "Alice",
      emailAddress: "alice@test.com",
      active: true,
      avatarUrls: {},
    },
    reporter: null,
    created: "2026-01-01T00:00:00.000Z",
    updated: "2026-01-02T00:00:00.000Z",
    resolutiondate: null,
    duedate: null,
    labels: ["bug"],
    components: [],
    fixVersions: [],
    subtasks: [],
    comment: { comments: [] },
    attachment: [],
    worklog: { worklogs: [] },
    issuelinks: [],
  },
};

function createMockDb() {
  return {
    user: {
      findMany: vi.fn().mockResolvedValue([
        { id: "user-1", email: "alice@test.com" },
      ]),
    },
    status: {
      findMany: vi.fn().mockResolvedValue([
        { id: "status-1", name: "To Do" },
        { id: "status-2", name: "In Progress" },
        { id: "status-3", name: "Done" },
      ]),
    },
    issueType: {
      findMany: vi.fn().mockResolvedValue([
        { id: "type-1", name: "Task" },
        { id: "type-2", name: "Bug" },
      ]),
    },
    priority: {
      findMany: vi.fn().mockResolvedValue([
        { id: "pri-1", name: "High" },
        { id: "pri-2", name: "Medium" },
        { id: "pri-3", name: "Low" },
      ]),
    },
    project: {
      upsert: vi.fn().mockResolvedValue({ id: "proj-1", key: "TEST" }),
    },
    issue: {
      create: vi.fn().mockResolvedValue({ id: "issue-1" }),
      update: vi.fn().mockResolvedValue({ id: "issue-1" }),
    },
    issueLink: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "link-1" }),
    },
    comment: { create: vi.fn() },
    timeLog: { create: vi.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const baseConfig: MigrationConfig = {
  source: {
    baseUrl: "https://test.atlassian.net",
    email: "test@example.com",
    apiToken: "test-token",
  },
  targetOrganizationId: "org-1",
  projectKeys: ["TEST"],
  options: {
    includeAttachments: false,
    includeWorklogs: false,
    includeComments: false,
    includeHistory: false,
    mapUsers: true,
    dryRun: false,
  },
};

describe("JiraMigrator", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();

    // Setup JiraClient mock - must use function (not arrow) for constructors
    vi.mocked(JiraClient).mockImplementation(
      function (this: unknown) {
        return {
          getUsers: vi.fn().mockResolvedValue([
            {
              accountId: "jira-1",
              displayName: "Alice",
              emailAddress: "alice@test.com",
              active: true,
            },
          ]),
          getProject: vi.fn().mockResolvedValue({
            id: "10001",
            key: "TEST",
            name: "Test Project",
            projectTypeKey: "software",
          }),
          getAllProjectIssues: vi.fn().mockResolvedValue([mockIssue]),
        } as unknown as JiraClient;
      } as unknown as ConstructorParameters<typeof JiraClient>[0] extends infer _Unused ? (...args: ConstructorParameters<typeof JiraClient>) => JiraClient : never,
    );
  });

  it("migrates a project with issues", async () => {
    const migrator = new JiraMigrator(db, baseConfig);
    const result = await migrator.migrate();

    expect(result.projectsMigrated).toBe(1);
    expect(result.issuesMigrated).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(db.issue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          summary: "Test issue",
          organizationId: "org-1",
        }),
      }),
    );
  });

  it("maps Jira users to Ordolix users by email", async () => {
    const migrator = new JiraMigrator(db, baseConfig);
    const result = await migrator.migrate();

    expect(result.userMappings).toHaveLength(1);
    expect(db.issue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assigneeId: "user-1",
        }),
      }),
    );
  });

  it("handles dry run mode", async () => {
    const dryRunConfig = {
      ...baseConfig,
      options: { ...baseConfig.options, dryRun: true },
    };
    const migrator = new JiraMigrator(db, dryRunConfig);
    const result = await migrator.migrate();

    expect(result.issuesMigrated).toBe(1);
    expect(db.issue.create).not.toHaveBeenCalled();
  });

  it("tracks progress", async () => {
    const migrator = new JiraMigrator(db, baseConfig);

    expect(migrator.getProgress().status).toBe("pending");

    await migrator.migrate();

    expect(migrator.getProgress().status).toBe("completed");
    expect(migrator.getProgress().completedAt).toBeInstanceOf(Date);
  });

  it("creates project via upsert", async () => {
    const migrator = new JiraMigrator(db, baseConfig);
    await migrator.migrate();

    expect(db.project.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_key: {
            organizationId: "org-1",
            key: "TEST",
          },
        },
        create: expect.objectContaining({
          key: "TEST",
          name: "Test Project",
        }),
      }),
    );
  });
});
