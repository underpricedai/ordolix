import { describe, expect, it, vi, beforeEach } from "vitest";
import { JiraClient } from "./jira-client";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

const instance = {
  baseUrl: "https://test.atlassian.net",
  email: "test@example.com",
  apiToken: "test-token",
};

describe("JiraClient", () => {
  let client: JiraClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new JiraClient(instance);
  });

  it("sends correct auth header", async () => {
    mockFetch.mockResolvedValue(jsonResponse([]));

    await client.getProjects();

    const [url, options] = mockFetch.mock.calls[0]!;
    expect(url).toBe("https://test.atlassian.net/rest/api/3/project");
    expect(options.headers.Authorization).toMatch(/^Basic /);
  });

  it("returns projects", async () => {
    const projects = [{ id: "1", key: "TEST", name: "Test Project" }];
    mockFetch.mockResolvedValue(jsonResponse(projects));

    const result = await client.getProjects();
    expect(result).toEqual(projects);
  });

  it("handles search with pagination", async () => {
    const searchResult = { total: 150, issues: Array(100).fill({ id: "1" }) };
    mockFetch.mockResolvedValue(jsonResponse(searchResult));

    const result = await client.searchIssues("project = TEST", 0, 100);
    expect(result.total).toBe(150);
    expect(result.issues).toHaveLength(100);

    const [, options] = mockFetch.mock.calls[0]!;
    expect(options.method).toBe("POST");
  });

  it("throws IntegrationError on API failure", async () => {
    mockFetch.mockResolvedValue(jsonResponse("Not Found", 404));

    await expect(client.getProject("NOPE")).rejects.toThrow("API error 404");
  });

  it("fetches server info", async () => {
    const info = { version: "1001.0.0", baseUrl: "https://test.atlassian.net" };
    mockFetch.mockResolvedValue(jsonResponse(info));

    const result = await client.getServerInfo();
    expect(result.version).toBe("1001.0.0");
  });

  it("fetches all project issues with pagination", async () => {
    const batch1 = { total: 3, issues: [{ id: "1" }, { id: "2" }] };
    const batch2 = { total: 3, issues: [{ id: "3" }] };

    mockFetch
      .mockResolvedValueOnce(jsonResponse(batch1))
      .mockResolvedValueOnce(jsonResponse(batch2));

    const onProgress = vi.fn();
    const issues = await client.getAllProjectIssues("TEST", onProgress);

    expect(issues).toHaveLength(3);
    expect(onProgress).toHaveBeenCalledWith(2, 3);
    expect(onProgress).toHaveBeenCalledWith(3, 3);
  });
});
