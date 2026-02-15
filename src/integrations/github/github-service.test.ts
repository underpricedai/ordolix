/**
 * Unit tests for GitHub integration service.
 *
 * @module integrations/github/github-service-test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import * as githubService from "./github-service";

function createMockDb() {
  return {
    integrationConfig: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    issue: {
      findFirst: vi.fn(),
    },
    gitHubLink: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  } as unknown as Parameters<typeof githubService.getConfig>[0];
}

describe("GitHub config CRUD", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("getConfig returns GitHub integration config", async () => {
    const mockConfig = {
      id: "cfg-1",
      provider: "github",
      config: { owner: "underpricedai", autoLink: true },
      isActive: true,
      webhookSecret: "secret",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    (db.integrationConfig.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockConfig);

    const result = await githubService.getConfig(db, "org-1");

    expect(result).toEqual(mockConfig);
    expect(db.integrationConfig.findFirst).toHaveBeenCalledWith({
      where: { organizationId: "org-1", provider: "github" },
      select: expect.any(Object),
    });
  });

  it("getConfig returns null when no config exists", async () => {
    (db.integrationConfig.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await githubService.getConfig(db, "org-1");

    expect(result).toBeNull();
  });

  it("upsertConfig creates new config when none exists", async () => {
    (db.integrationConfig.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const mockCreated = { id: "cfg-1", provider: "github", config: { owner: "test" } };
    (db.integrationConfig.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockCreated);

    const result = await githubService.upsertConfig(db, "org-1", {
      owner: "test",
      autoLink: true,
    });

    expect(result).toEqual(mockCreated);
    expect(db.integrationConfig.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        provider: "github",
        config: { owner: "test", repo: null, baseUrl: null, autoLink: true },
        isActive: true,
      }),
    });
  });

  it("upsertConfig updates existing config", async () => {
    const existing = { id: "cfg-1", isActive: true };
    (db.integrationConfig.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    const mockUpdated = { id: "cfg-1", provider: "github" };
    (db.integrationConfig.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockUpdated);

    const result = await githubService.upsertConfig(db, "org-1", {
      owner: "new-owner",
      repo: "my-repo",
    });

    expect(result).toEqual(mockUpdated);
    expect(db.integrationConfig.update).toHaveBeenCalledWith({
      where: { id: "cfg-1" },
      data: {
        config: { owner: "new-owner", repo: "my-repo", baseUrl: null, autoLink: true },
        isActive: true,
      },
    });
  });

  it("deleteConfig throws NotFoundError when config missing", async () => {
    (db.integrationConfig.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(githubService.deleteConfig(db, "org-1")).rejects.toThrow("not found");
  });

  it("deleteConfig removes existing config", async () => {
    const existing = { id: "cfg-1" };
    (db.integrationConfig.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    (db.integrationConfig.delete as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

    const result = await githubService.deleteConfig(db, "org-1");

    expect(result).toEqual(existing);
    expect(db.integrationConfig.delete).toHaveBeenCalledWith({ where: { id: "cfg-1" } });
  });

  it("regenerateWebhookSecret updates secret on existing config", async () => {
    const existing = { id: "cfg-1" };
    (db.integrationConfig.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    (db.integrationConfig.update as ReturnType<typeof vi.fn>).mockResolvedValue({ ...existing, webhookSecret: "new" });

    const result = await githubService.regenerateWebhookSecret(db, "org-1");

    expect(db.integrationConfig.update).toHaveBeenCalledWith({
      where: { id: "cfg-1" },
      data: { webhookSecret: expect.any(String) },
    });
  });

  it("regenerateWebhookSecret throws when no config", async () => {
    (db.integrationConfig.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(githubService.regenerateWebhookSecret(db, "org-1")).rejects.toThrow("not found");
  });
});

describe("GitHub link queries", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("getLinksForIssue returns links when issue exists", async () => {
    (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "issue-1" });
    const mockLinks = [
      { id: "link-1", resourceType: "pull_request", owner: "test", repo: "repo", number: 1 },
    ];
    (db.gitHubLink.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockLinks);

    const result = await githubService.getLinksForIssue(db, "org-1", "issue-1");

    expect(result).toEqual(mockLinks);
  });

  it("getLinksForIssue throws NotFoundError when issue missing", async () => {
    (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(githubService.getLinksForIssue(db, "org-1", "issue-1")).rejects.toThrow("not found");
  });

  it("deleteLink removes link belonging to org", async () => {
    const mockLink = { id: "link-1", issue: { organizationId: "org-1" } };
    (db.gitHubLink.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockLink);
    (db.gitHubLink.delete as ReturnType<typeof vi.fn>).mockResolvedValue(mockLink);

    const result = await githubService.deleteLink(db, "org-1", "link-1");

    expect(result).toEqual(mockLink);
  });

  it("deleteLink throws when link belongs to different org", async () => {
    const mockLink = { id: "link-1", issue: { organizationId: "org-2" } };
    (db.gitHubLink.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockLink);

    await expect(githubService.deleteLink(db, "org-1", "link-1")).rejects.toThrow("not found");
  });

  it("getRecentLinks returns links with issue info", async () => {
    const mockLinks = [
      {
        id: "link-1",
        resourceType: "commit",
        issue: { id: "i-1", key: "ORD-1", summary: "Test" },
      },
    ];
    (db.gitHubLink.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockLinks);

    const result = await githubService.getRecentLinks(db, "org-1", 10);

    expect(result).toEqual(mockLinks);
    expect(db.gitHubLink.findMany).toHaveBeenCalledWith({
      where: { issue: { organizationId: "org-1" } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { issue: { select: { id: true, key: true, summary: true } } },
    });
  });
});
