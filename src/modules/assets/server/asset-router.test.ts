import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./asset-service", () => ({
  createAssetType: vi.fn(),
  listAssetTypes: vi.fn(),
  updateAssetType: vi.fn(),
  deleteAssetType: vi.fn(),
  createAsset: vi.fn(),
  getAsset: vi.fn(),
  listAssets: vi.fn(),
  updateAsset: vi.fn(),
  deleteAsset: vi.fn(),
  addRelationship: vi.fn(),
  removeRelationship: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/lib/logger", () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(),
    }),
  },
}));
vi.mock("@/server/trpc/dev-auth", () => ({
  createDevSession: vi.fn().mockResolvedValue(null),
  getOrganizationId: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/modules/permissions/server/permission-checker", () => ({
  checkGlobalPermission: vi.fn().mockResolvedValue(true),
  checkPermission: vi.fn().mockResolvedValue(true),
  checkIssueSecurityAccess: vi.fn().mockResolvedValue(true),
  resolveProjectPermissions: vi.fn().mockResolvedValue(new Set(["BROWSE_PROJECTS", "CREATE_ISSUES", "EDIT_ISSUES"])),
  invalidatePermissionCache: vi.fn().mockResolvedValue(undefined),
}));

import * as assetService from "./asset-service";
import { createRouter } from "@/server/trpc/init";
import { assetRouter } from "./asset-router";
import type { TRPCContext } from "@/server/trpc/init";

const appRouter = createRouter({
  asset: assetRouter,
});

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
      child: vi.fn().mockReturnThis(), info: vi.fn(), error: vi.fn(),
      warn: vi.fn(), debug: vi.fn(),
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
      child: vi.fn().mockReturnThis(), info: vi.fn(), error: vi.fn(),
      warn: vi.fn(), debug: vi.fn(),
    } as unknown as TRPCContext["logger"],
  };
}

describe("assetRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => { vi.clearAllMocks(); });

  it("rejects unauthenticated requests", async () => {
    const trpc = caller(createUnauthenticatedContext());
    await expect(
      trpc.asset.listAssetTypes(),
    ).rejects.toThrow(TRPCError);
  });

  it("createAssetType calls service", async () => {
    vi.mocked(assetService.createAssetType).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.asset.createAssetType({ name: "Server" });

    expect(assetService.createAssetType).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({ name: "Server" }),
    );
  });

  it("listAssetTypes calls service", async () => {
    vi.mocked(assetService.listAssetTypes).mockResolvedValue([] as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.asset.listAssetTypes();

    expect(assetService.listAssetTypes).toHaveBeenCalledWith(
      expect.anything(), "org-1",
    );
  });

  it("createAsset calls service", async () => {
    vi.mocked(assetService.createAsset).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.asset.createAsset({ assetTypeId: "at-1", name: "Server-001" });

    expect(assetService.createAsset).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({ assetTypeId: "at-1", name: "Server-001" }),
    );
  });

  it("getAsset calls service", async () => {
    vi.mocked(assetService.getAsset).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.asset.getAsset({ id: "a-1" });

    expect(assetService.getAsset).toHaveBeenCalledWith(
      expect.anything(), "org-1", "a-1",
    );
  });

  it("addRelationship calls service", async () => {
    vi.mocked(assetService.addRelationship).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.asset.addRelationship({
      fromAssetId: "a-1",
      toAssetId: "a-2",
      relationshipType: "depends_on",
    });

    expect(assetService.addRelationship).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({
        fromAssetId: "a-1",
        toAssetId: "a-2",
        relationshipType: "depends_on",
      }),
    );
  });

  it("removeRelationship calls service", async () => {
    vi.mocked(assetService.removeRelationship).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.asset.removeRelationship({ id: "rel-1" });

    expect(assetService.removeRelationship).toHaveBeenCalledWith(
      expect.anything(), "org-1", "rel-1",
    );
  });
});
