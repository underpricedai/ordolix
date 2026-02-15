import { describe, expect, it } from "vitest";
import {
  createProjectInput,
  updateProjectInput,
  listProjectsInput,
  getProjectInput,
  archiveProjectInput,
  addProjectMemberInput,
  removeProjectMemberInput,
} from "./schemas";

describe("createProjectInput", () => {
  const validInput = {
    name: "Website Redesign",
    key: "WEB",
    projectTypeKey: "software" as const,
  };

  it("accepts valid minimal input", () => {
    const result = createProjectInput.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid full input", () => {
    const result = createProjectInput.safeParse({
      ...validInput,
      description: "A full redesign of the marketing website",
      leadId: "user-1",
      templateKey: "scrum",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = createProjectInput.safeParse({
      key: "WEB",
      projectTypeKey: "software",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createProjectInput.safeParse({
      ...validInput,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing key", () => {
    const result = createProjectInput.safeParse({
      name: "Test",
      projectTypeKey: "software",
    });
    expect(result.success).toBe(false);
  });

  it("rejects lowercase key", () => {
    const result = createProjectInput.safeParse({
      ...validInput,
      key: "web",
    });
    expect(result.success).toBe(false);
  });

  it("rejects key shorter than 2 chars", () => {
    const result = createProjectInput.safeParse({
      ...validInput,
      key: "W",
    });
    expect(result.success).toBe(false);
  });

  it("rejects key longer than 10 chars", () => {
    const result = createProjectInput.safeParse({
      ...validInput,
      key: "ABCDEFGHIJK",
    });
    expect(result.success).toBe(false);
  });

  it("rejects key with numbers", () => {
    const result = createProjectInput.safeParse({
      ...validInput,
      key: "WEB1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid projectTypeKey", () => {
    const result = createProjectInput.safeParse({
      ...validInput,
      projectTypeKey: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing projectTypeKey", () => {
    const result = createProjectInput.safeParse({
      name: "Test",
      key: "TST",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid project type keys", () => {
    for (const typeKey of ["software", "service_management", "business"] as const) {
      const result = createProjectInput.safeParse({
        ...validInput,
        projectTypeKey: typeKey,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("updateProjectInput", () => {
  it("accepts valid update with id only", () => {
    const result = updateProjectInput.safeParse({ id: "proj-1" });
    expect(result.success).toBe(true);
  });

  it("accepts partial updates", () => {
    const result = updateProjectInput.safeParse({
      id: "proj-1",
      name: "Updated name",
      isArchived: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = updateProjectInput.safeParse({ name: "Updated" });
    expect(result.success).toBe(false);
  });

  it("allows nullable fields", () => {
    const result = updateProjectInput.safeParse({
      id: "proj-1",
      description: null,
      leadId: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("listProjectsInput", () => {
  it("accepts empty input with defaults", () => {
    const result = listProjectsInput.parse({});
    expect(result.limit).toBe(50);
    expect(result.isArchived).toBe(false);
  });

  it("accepts full filter params", () => {
    const result = listProjectsInput.safeParse({
      cursor: "cursor-abc",
      limit: 25,
      search: "web",
      isArchived: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects limit below 1", () => {
    const result = listProjectsInput.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects limit above 100", () => {
    const result = listProjectsInput.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it("defaults isArchived to false", () => {
    const result = listProjectsInput.parse({});
    expect(result.isArchived).toBe(false);
  });
});

describe("getProjectInput", () => {
  it("accepts id lookup", () => {
    const result = getProjectInput.safeParse({ id: "proj-1" });
    expect(result.success).toBe(true);
  });

  it("accepts key lookup", () => {
    const result = getProjectInput.safeParse({ key: "WEB" });
    expect(result.success).toBe(true);
  });

  it("rejects empty object", () => {
    const result = getProjectInput.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("archiveProjectInput", () => {
  it("accepts valid id", () => {
    const result = archiveProjectInput.safeParse({ id: "proj-1" });
    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = archiveProjectInput.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("addProjectMemberInput", () => {
  it("accepts valid input", () => {
    const result = addProjectMemberInput.safeParse({
      projectId: "proj-1",
      userId: "user-1",
      roleId: "role-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing projectId", () => {
    const result = addProjectMemberInput.safeParse({
      userId: "user-1",
      roleId: "role-1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing userId", () => {
    const result = addProjectMemberInput.safeParse({
      projectId: "proj-1",
      roleId: "role-1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing roleId", () => {
    const result = addProjectMemberInput.safeParse({
      projectId: "proj-1",
      userId: "user-1",
    });
    expect(result.success).toBe(false);
  });
});

describe("removeProjectMemberInput", () => {
  it("accepts valid input", () => {
    const result = removeProjectMemberInput.safeParse({
      projectId: "proj-1",
      userId: "user-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing projectId", () => {
    const result = removeProjectMemberInput.safeParse({
      userId: "user-1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing userId", () => {
    const result = removeProjectMemberInput.safeParse({
      projectId: "proj-1",
    });
    expect(result.success).toBe(false);
  });
});
