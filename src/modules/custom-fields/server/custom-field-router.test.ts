import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./custom-field-service", () => ({
  createField: vi.fn(),
  updateField: vi.fn(),
  listFields: vi.fn(),
  getField: vi.fn(),
  deleteField: vi.fn(),
  setFieldValue: vi.fn(),
  getFieldValues: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/server/db", () => ({ db: {} }));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock("@/server/trpc/dev-auth", () => ({
  createDevSession: vi.fn().mockResolvedValue(null),
  getOrganizationId: vi.fn().mockResolvedValue(null),
}));

import * as customFieldService from "./custom-field-service";
import { appRouter } from "@/server/trpc/router";
import type { TRPCContext } from "@/server/trpc/init";

function createAuthenticatedContext(
  overrides: Partial<TRPCContext> = {},
): TRPCContext {
  return {
    db: {} as TRPCContext["db"],
    session: {
      user: { id: "user-1", name: "Test User", email: "test@test.com" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    },
    organizationId: "org-1",
    requestId: "req-1",
    logger: {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as TRPCContext["logger"],
    ...overrides,
  };
}

function createUnauthenticatedContext(): TRPCContext {
  return {
    db: {} as TRPCContext["db"],
    session: null,
    organizationId: null,
    requestId: "req-1",
    logger: {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as TRPCContext["logger"],
  };
}

describe("customFieldRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("auth", () => {
    it("rejects unauthenticated requests", async () => {
      const trpc = caller(createUnauthenticatedContext());
      await expect(
        trpc.customField.getById({ id: "field-1" }),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects requests without organizationId", async () => {
      const trpc = caller(
        createAuthenticatedContext({ organizationId: null }),
      );
      await expect(
        trpc.customField.getById({ id: "field-1" }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("create", () => {
    it("calls createField with correct args", async () => {
      const mockResult = { id: "field-1", name: "Sprint", fieldType: "text" };
      vi.mocked(customFieldService.createField).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.customField.create({
        name: "Sprint",
        fieldType: "text",
      });

      expect(result).toEqual(mockResult);
      expect(customFieldService.createField).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        expect.objectContaining({ name: "Sprint", fieldType: "text" }),
      );
    });
  });

  describe("list", () => {
    it("calls listFields with correct args", async () => {
      const mockResult = [{ id: "field-1", name: "Sprint" }];
      vi.mocked(customFieldService.listFields).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.customField.list({});

      expect(result).toEqual(mockResult);
      expect(customFieldService.listFields).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.any(Object),
      );
    });
  });

  describe("delete", () => {
    it("calls deleteField with correct args", async () => {
      vi.mocked(customFieldService.deleteField).mockResolvedValue(
        undefined as never,
      );

      const trpc = caller(createAuthenticatedContext());
      await trpc.customField.delete({ id: "field-1" });

      expect(customFieldService.deleteField).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "field-1",
      );
    });
  });

  describe("setValue", () => {
    it("calls setFieldValue with correct args", async () => {
      const mockResult = { id: "val-1", value: "hello" };
      vi.mocked(customFieldService.setFieldValue).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.customField.setValue({
        entityId: "issue-1",
        entityType: "issue",
        fieldId: "field-1",
        value: "hello",
      });

      expect(result).toEqual(mockResult);
      expect(customFieldService.setFieldValue).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({
          entityId: "issue-1",
          fieldId: "field-1",
        }),
      );
    });
  });

  describe("getValues", () => {
    it("calls getFieldValues with correct args", async () => {
      const mockResult = [
        { fieldId: "field-1", fieldName: "Sprint", fieldType: "text", value: "v1" },
      ];
      vi.mocked(customFieldService.getFieldValues).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.customField.getValues({
        entityId: "issue-1",
        entityType: "issue",
      });

      expect(result).toEqual(mockResult);
      expect(customFieldService.getFieldValues).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({ entityId: "issue-1", entityType: "issue" }),
      );
    });
  });
});
