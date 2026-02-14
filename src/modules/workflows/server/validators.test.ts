import { describe, expect, it, vi } from "vitest";
import { runValidators, type ValidatorContext } from "./validators";
import { ValidationError } from "@/server/lib/errors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockValidatorDb(): any {
  return {
    issue: { count: vi.fn() },
  };
}

const ORG_ID = "org-1";

describe("required_field", () => {
  it("passes when field is set", async () => {
    const ctx: ValidatorContext = {
      db: createMockValidatorDb(),
      organizationId: ORG_ID,
      issue: { id: "issue-1", resolutionId: "res-1" },
    };

    await expect(
      runValidators(ctx, [
        { type: "required_field", config: { field: "resolutionId" } },
      ]),
    ).resolves.toBeUndefined();
  });

  it("fails when field is null", async () => {
    const ctx: ValidatorContext = {
      db: createMockValidatorDb(),
      organizationId: ORG_ID,
      issue: { id: "issue-1", resolutionId: null },
    };

    await expect(
      runValidators(ctx, [
        { type: "required_field", config: { field: "resolutionId" } },
      ]),
    ).rejects.toThrow(ValidationError);
  });

  it("fails when field is undefined", async () => {
    const ctx: ValidatorContext = {
      db: createMockValidatorDb(),
      organizationId: ORG_ID,
      issue: { id: "issue-1" },
    };

    await expect(
      runValidators(ctx, [
        { type: "required_field", config: { field: "resolutionId" } },
      ]),
    ).rejects.toThrow(ValidationError);
  });

  it("throws when config is missing field key", async () => {
    const ctx: ValidatorContext = {
      db: createMockValidatorDb(),
      organizationId: ORG_ID,
      issue: { id: "issue-1" },
    };

    await expect(
      runValidators(ctx, [{ type: "required_field", config: {} }]),
    ).rejects.toThrow(ValidationError);
  });
});

describe("no_open_subtasks", () => {
  it("passes when no open children", async () => {
    const db = createMockValidatorDb();
    db.issue.count.mockResolvedValue(0);
    const ctx: ValidatorContext = {
      db,
      organizationId: ORG_ID,
      issue: { id: "issue-1" },
    };

    await expect(
      runValidators(ctx, [{ type: "no_open_subtasks", config: {} }]),
    ).resolves.toBeUndefined();
  });

  it("fails when open children exist", async () => {
    const db = createMockValidatorDb();
    db.issue.count.mockResolvedValue(3);
    const ctx: ValidatorContext = {
      db,
      organizationId: ORG_ID,
      issue: { id: "issue-1" },
    };

    await expect(
      runValidators(ctx, [{ type: "no_open_subtasks", config: {} }]),
    ).rejects.toThrow(ValidationError);
  });
});

describe("runValidators", () => {
  it("throws on unknown validator type", async () => {
    const ctx: ValidatorContext = {
      db: createMockValidatorDb(),
      organizationId: ORG_ID,
      issue: { id: "issue-1" },
    };

    await expect(
      runValidators(ctx, [{ type: "nonexistent", config: {} }]),
    ).rejects.toThrow(ValidationError);
  });

  it("succeeds with empty validators array", async () => {
    const ctx: ValidatorContext = {
      db: createMockValidatorDb(),
      organizationId: ORG_ID,
      issue: { id: "issue-1" },
    };

    await expect(runValidators(ctx, [])).resolves.toBeUndefined();
  });
});
