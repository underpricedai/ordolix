import { z } from "zod";

// ── Asset Statuses ─────────────────────────────────────────────────────────

export const ASSET_STATUSES = [
  "ordered",
  "received",
  "deployed",
  "in_use",
  "maintenance",
  "retired",
  "disposed",
] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const assetStatusSchema = z.enum(ASSET_STATUSES);

// ── Attribute Field Types ──────────────────────────────────────────────────

export const ATTRIBUTE_FIELD_TYPES = [
  "text",
  "number",
  "date",
  "boolean",
  "select",
  "reference",
  "url",
  "ipAddress",
  "user",
] as const;

export type AttributeFieldType = (typeof ATTRIBUTE_FIELD_TYPES)[number];

export const attributeFieldTypeSchema = z.enum(ATTRIBUTE_FIELD_TYPES);

// ── Asset History Actions ──────────────────────────────────────────────────

export const ASSET_HISTORY_ACTIONS = [
  "created",
  "updated",
  "status_changed",
  "relationship_changed",
  "deleted",
] as const;

export type AssetHistoryAction = (typeof ASSET_HISTORY_ACTIONS)[number];

// ── Asset Type ─────────────────────────────────────────────────────────────

export const createAssetTypeInput = z.object({
  name: z.string().min(1).max(255),
  icon: z.string().optional(),
  description: z.string().max(1000).optional(),
  color: z.string().max(20).optional(),
  schema: z.record(z.string(), z.unknown()).default({}),
});

export type CreateAssetTypeInput = z.infer<typeof createAssetTypeInput>;

export const updateAssetTypeInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  icon: z.string().optional(),
  description: z.string().max(1000).optional(),
  color: z.string().max(20).optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateAssetTypeInput = z.infer<typeof updateAssetTypeInput>;

// ── Asset ──────────────────────────────────────────────────────────────────

export const createAssetInput = z.object({
  assetTypeId: z.string().min(1),
  name: z.string().min(1).max(255),
  status: assetStatusSchema.default("ordered"),
  assigneeId: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).default({}),
});

export type CreateAssetInput = z.infer<typeof createAssetInput>;

export const updateAssetInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  status: assetStatusSchema.optional(),
  assigneeId: z.string().nullable().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateAssetInput = z.infer<typeof updateAssetInput>;

export const listAssetsInput = z.object({
  assetTypeId: z.string().optional(),
  status: assetStatusSchema.optional(),
  assigneeId: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type ListAssetsInput = z.infer<typeof listAssetsInput>;

// ── Relationships ──────────────────────────────────────────────────────────

export const addRelationshipInput = z.object({
  fromAssetId: z.string().min(1),
  toAssetId: z.string().min(1),
  relationshipType: z.string().min(1).max(100),
});

export type AddRelationshipInput = z.infer<typeof addRelationshipInput>;

export const removeRelationshipInput = z.object({
  id: z.string().min(1),
});

export type RemoveRelationshipInput = z.infer<typeof removeRelationshipInput>;

// ── Attribute Definitions ──────────────────────────────────────────────────

export const createAttributeDefinitionInput = z.object({
  assetTypeId: z.string().min(1),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Must be a valid identifier"),
  label: z.string().min(1).max(255),
  fieldType: attributeFieldTypeSchema,
  isRequired: z.boolean().default(false),
  options: z.unknown().optional(),
  defaultValue: z.string().optional(),
  position: z.number().int().min(0).default(0),
  description: z.string().max(500).optional(),
});

export type CreateAttributeDefinitionInput = z.infer<typeof createAttributeDefinitionInput>;

export const updateAttributeDefinitionInput = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(255).optional(),
  fieldType: attributeFieldTypeSchema.optional(),
  isRequired: z.boolean().optional(),
  options: z.unknown().optional(),
  defaultValue: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
  description: z.string().max(500).nullable().optional(),
});

export type UpdateAttributeDefinitionInput = z.infer<typeof updateAttributeDefinitionInput>;

export const reorderAttributesInput = z.object({
  assetTypeId: z.string().min(1),
  order: z.array(z.object({
    id: z.string().min(1),
    position: z.number().int().min(0),
  })),
});

export type ReorderAttributesInput = z.infer<typeof reorderAttributesInput>;

// ── Lifecycle Transitions ──────────────────────────────────────────────────

export const setLifecycleTransitionsInput = z.object({
  assetTypeId: z.string().nullable(),
  transitions: z.array(z.object({
    fromStatus: assetStatusSchema,
    toStatus: assetStatusSchema,
    requiredFields: z.array(z.string()).default([]),
  })),
});

export type SetLifecycleTransitionsInput = z.infer<typeof setLifecycleTransitionsInput>;

export const transitionAssetStatusInput = z.object({
  assetId: z.string().min(1),
  toStatus: assetStatusSchema,
});

export type TransitionAssetStatusInput = z.infer<typeof transitionAssetStatusInput>;

// ── Asset History ──────────────────────────────────────────────────────────

export const getAssetHistoryInput = z.object({
  assetId: z.string().min(1),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type GetAssetHistoryInput = z.infer<typeof getAssetHistoryInput>;

// ── Financial Schemas ────────────────────────────────────────────────────────

export const COST_TYPES = ["capex", "opex"] as const;
export const DEPRECIATION_METHODS = ["straight_line", "declining_balance"] as const;

export const setAssetFinancialsInput = z.object({
  assetId: z.string().min(1),
  purchasePrice: z.number().nonnegative().nullable().optional(),
  purchaseCurrency: z.string().default("USD"),
  purchaseDate: z.coerce.date().nullable().optional(),
  costCenter: z.string().nullable().optional(),
  costType: z.enum(COST_TYPES).nullable().optional(),
  depreciationMethod: z.enum(DEPRECIATION_METHODS).nullable().optional(),
  usefulLifeMonths: z.number().int().positive().nullable().optional(),
  salvageValue: z.number().nonnegative().nullable().optional(),
  warrantyStart: z.coerce.date().nullable().optional(),
  warrantyEnd: z.coerce.date().nullable().optional(),
  warrantyProvider: z.string().nullable().optional(),
  warrantyNotes: z.string().nullable().optional(),
  maintenanceCost: z.number().nonnegative().nullable().optional(),
  disposalValue: z.number().nonnegative().nullable().optional(),
  disposalDate: z.coerce.date().nullable().optional(),
});

export type SetAssetFinancialsInput = z.infer<typeof setAssetFinancialsInput>;

export const warrantyAlertsInput = z.object({
  daysAhead: z.number().int().min(1).max(365).default(30),
});

export type WarrantyAlertsInput = z.infer<typeof warrantyAlertsInput>;

// ── License Schemas ──────────────────────────────────────────────────────────

export const LICENSE_TYPES = ["perpetual", "subscription", "concurrent", "site", "oem"] as const;
export const LICENSE_STATUSES = ["active", "expired", "cancelled"] as const;

export const createLicenseInput = z.object({
  name: z.string().min(1).max(255),
  vendor: z.string().nullable().optional(),
  licenseType: z.enum(LICENSE_TYPES),
  licenseKey: z.string().nullable().optional(),
  totalEntitlements: z.number().int().positive().default(1),
  purchasePrice: z.number().nonnegative().nullable().optional(),
  currency: z.string().default("USD"),
  purchaseDate: z.coerce.date().nullable().optional(),
  renewalDate: z.coerce.date().nullable().optional(),
  expirationDate: z.coerce.date().nullable().optional(),
  autoRenew: z.boolean().default(false),
  renewalCost: z.number().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(LICENSE_STATUSES).default("active"),
});

export type CreateLicenseInput = z.infer<typeof createLicenseInput>;

export const updateLicenseInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  vendor: z.string().nullable().optional(),
  licenseType: z.enum(LICENSE_TYPES).optional(),
  licenseKey: z.string().nullable().optional(),
  totalEntitlements: z.number().int().positive().optional(),
  purchasePrice: z.number().nonnegative().nullable().optional(),
  currency: z.string().optional(),
  purchaseDate: z.coerce.date().nullable().optional(),
  renewalDate: z.coerce.date().nullable().optional(),
  expirationDate: z.coerce.date().nullable().optional(),
  autoRenew: z.boolean().optional(),
  renewalCost: z.number().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(LICENSE_STATUSES).optional(),
});

export type UpdateLicenseInput = z.infer<typeof updateLicenseInput>;

export const listLicensesInput = z.object({
  status: z.enum(LICENSE_STATUSES).optional(),
  vendor: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type ListLicensesInput = z.infer<typeof listLicensesInput>;

export const allocateLicenseInput = z.object({
  licenseId: z.string().min(1),
  assetId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
});

export type AllocateLicenseInput = z.infer<typeof allocateLicenseInput>;

export const renewalAlertsInput = z.object({
  daysAhead: z.number().int().min(1).max(365).default(30),
});

export type RenewalAlertsInput = z.infer<typeof renewalAlertsInput>;

// ── Vendor Schemas ───────────────────────────────────────────────────────────

export const CONTRACT_STATUSES = ["active", "expired", "cancelled"] as const;

export const createVendorInput = z.object({
  name: z.string().min(1).max(255),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  address: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export type CreateVendorInput = z.infer<typeof createVendorInput>;

export const updateVendorInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  address: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateVendorInput = z.infer<typeof updateVendorInput>;

export const listVendorsInput = z.object({
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type ListVendorsInput = z.infer<typeof listVendorsInput>;

export const createVendorContractInput = z.object({
  vendorId: z.string().min(1),
  contractNumber: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  value: z.number().nonnegative().nullable().optional(),
  autoRenew: z.boolean().default(false),
  status: z.enum(CONTRACT_STATUSES).default("active"),
  attachmentUrl: z.string().url().nullable().optional(),
});

export type CreateVendorContractInput = z.infer<typeof createVendorContractInput>;

// ── Procurement Schemas ──────────────────────────────────────────────────────

export const PROCUREMENT_REQUEST_STATUSES = [
  "draft", "pending_approval", "approved", "rejected", "ordered", "received", "cancelled",
] as const;
export const PROCUREMENT_URGENCIES = ["low", "normal", "high", "critical"] as const;
export const PURCHASE_ORDER_STATUSES = [
  "ordered", "partially_received", "received", "invoiced", "paid", "cancelled",
] as const;

export const createProcurementRequestInput = z.object({
  title: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  vendorId: z.string().nullable().optional(),
  estimatedCost: z.number().nonnegative().nullable().optional(),
  quantity: z.number().int().positive().default(1),
  costCenter: z.string().nullable().optional(),
  urgency: z.enum(PROCUREMENT_URGENCIES).default("normal"),
});
export type CreateProcurementRequestInput = z.infer<typeof createProcurementRequestInput>;

export const listProcurementRequestsInput = z.object({
  status: z.enum(PROCUREMENT_REQUEST_STATUSES).optional(),
  urgency: z.enum(PROCUREMENT_URGENCIES).optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
export type ListProcurementRequestsInput = z.infer<typeof listProcurementRequestsInput>;

export const decideProcurementApprovalInput = z.object({
  approvalId: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
  comment: z.string().nullable().optional(),
});
export type DecideProcurementApprovalInput = z.infer<typeof decideProcurementApprovalInput>;

export const createPurchaseOrderInput = z.object({
  procurementRequestId: z.string().nullable().optional(),
  vendorId: z.string().min(1),
  totalAmount: z.number().nonnegative().nullable().optional(),
  expectedDelivery: z.coerce.date().nullable().optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().int().positive().default(1),
    unitPrice: z.number().nonnegative(),
  })).default([]),
});
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderInput>;

export const listPurchaseOrdersInput = z.object({
  status: z.enum(PURCHASE_ORDER_STATUSES).optional(),
  vendorId: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
export type ListPurchaseOrdersInput = z.infer<typeof listPurchaseOrdersInput>;

export const receiveOrderInput = z.object({
  orderId: z.string().min(1),
  lineItemUpdates: z.array(z.object({
    lineItemId: z.string().min(1),
    assetId: z.string().nullable().optional(),
  })).default([]),
});
export type ReceiveOrderInput = z.infer<typeof receiveOrderInput>;

export const matchInvoiceInput = z.object({
  orderId: z.string().min(1),
  invoiceNumber: z.string().min(1),
  invoiceAmount: z.number().nonnegative(),
  invoiceDate: z.coerce.date(),
});
export type MatchInvoiceInput = z.infer<typeof matchInvoiceInput>;

// ── Import/Export Schemas ────────────────────────────────────────────────────

export const IMPORT_JOB_STATUSES = ["pending", "processing", "completed", "failed"] as const;

export const startImportInput = z.object({
  assetTypeId: z.string().min(1),
  fileName: z.string().min(1),
  csvContent: z.string().min(1),
  columnMapping: z.record(z.string(), z.string()).default({}),
});

export type StartImportInput = z.infer<typeof startImportInput>;

export const validateImportPreviewInput = z.object({
  assetTypeId: z.string().min(1),
  csvContent: z.string().min(1),
  columnMapping: z.record(z.string(), z.string()).default({}),
  maxRows: z.number().int().min(1).max(100).default(10),
});

export type ValidateImportPreviewInput = z.infer<typeof validateImportPreviewInput>;

export const listImportJobsInput = z.object({
  status: z.enum(IMPORT_JOB_STATUSES).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type ListImportJobsInput = z.infer<typeof listImportJobsInput>;

export const exportAssetsInput = z.object({
  assetTypeId: z.string().min(1),
  status: z.enum(ASSET_STATUSES).optional(),
  search: z.string().optional(),
});

export type ExportAssetsInput = z.infer<typeof exportAssetsInput>;
