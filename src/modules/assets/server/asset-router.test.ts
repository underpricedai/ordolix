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

vi.mock("./asset-attribute-service", () => ({
  listAttributeDefinitions: vi.fn(),
  createAttributeDefinition: vi.fn(),
  updateAttributeDefinition: vi.fn(),
  deleteAttributeDefinition: vi.fn(),
  reorderAttributes: vi.fn(),
}));

vi.mock("./asset-lifecycle-service", () => ({
  listLifecycleTransitions: vi.fn(),
  setLifecycleTransitions: vi.fn(),
  transitionAssetStatus: vi.fn(),
  getAssetHistory: vi.fn(),
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
import * as attributeService from "./asset-attribute-service";
import * as lifecycleService from "./asset-lifecycle-service";
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

  // ── Asset Type Procedures ──────────────────────────────────────────────

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

  // ── Asset Procedures ───────────────────────────────────────────────────

  it("createAsset calls service with userId", async () => {
    vi.mocked(assetService.createAsset).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.asset.createAsset({ assetTypeId: "at-1", name: "Server-001" });

    expect(assetService.createAsset).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({ assetTypeId: "at-1", name: "Server-001" }),
      "user-1",
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

  it("deleteAsset calls service with userId", async () => {
    vi.mocked(assetService.deleteAsset).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.asset.deleteAsset({ id: "a-1" });

    expect(assetService.deleteAsset).toHaveBeenCalledWith(
      expect.anything(), "org-1", "a-1", "user-1",
    );
  });

  // ── Relationship Procedures ────────────────────────────────────────────

  it("addRelationship calls service with userId", async () => {
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
      "user-1",
    );
  });

  // ── Attribute Definition Procedures ────────────────────────────────────

  it("listAttributeDefinitions calls service", async () => {
    vi.mocked(attributeService.listAttributeDefinitions).mockResolvedValue([] as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.asset.listAttributeDefinitions({ assetTypeId: "at-1" });

    expect(attributeService.listAttributeDefinitions).toHaveBeenCalledWith(
      expect.anything(), "org-1", "at-1",
    );
  });

  it("createAttributeDefinition calls service", async () => {
    vi.mocked(attributeService.createAttributeDefinition).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.asset.createAttributeDefinition({
      assetTypeId: "at-1",
      name: "serialNumber",
      label: "Serial Number",
      fieldType: "text",
    });

    expect(attributeService.createAttributeDefinition).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({
        assetTypeId: "at-1",
        name: "serialNumber",
        fieldType: "text",
      }),
    );
  });

  // ── Lifecycle Procedures ───────────────────────────────────────────────

  it("transitionAssetStatus calls service with userId", async () => {
    vi.mocked(lifecycleService.transitionAssetStatus).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.asset.transitionAssetStatus({
      assetId: "a-1",
      toStatus: "received",
    });

    expect(lifecycleService.transitionAssetStatus).toHaveBeenCalledWith(
      expect.anything(), "org-1", "a-1", "received", "user-1",
    );
  });

  it("getAssetHistory calls service", async () => {
    vi.mocked(lifecycleService.getAssetHistory).mockResolvedValue([] as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.asset.getAssetHistory({ assetId: "a-1" });

    expect(lifecycleService.getAssetHistory).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({ assetId: "a-1" }),
    );
  });
});
