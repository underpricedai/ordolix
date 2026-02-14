import { z } from "zod";

export const createAssetTypeInput = z.object({
  name: z.string().min(1).max(255),
  icon: z.string().optional(),
  schema: z.record(z.string(), z.unknown()).default({}),
});

export type CreateAssetTypeInput = z.infer<typeof createAssetTypeInput>;

export const updateAssetTypeInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  icon: z.string().optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateAssetTypeInput = z.infer<typeof updateAssetTypeInput>;

export const createAssetInput = z.object({
  assetTypeId: z.string().min(1),
  name: z.string().min(1).max(255),
  status: z.string().default("active"),
  attributes: z.record(z.string(), z.unknown()).default({}),
});

export type CreateAssetInput = z.infer<typeof createAssetInput>;

export const updateAssetInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  status: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateAssetInput = z.infer<typeof updateAssetInput>;

export const listAssetsInput = z.object({
  assetTypeId: z.string().optional(),
  status: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type ListAssetsInput = z.infer<typeof listAssetsInput>;

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
