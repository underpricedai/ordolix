/**
 * Tooltip content dictionary for the Assets module.
 * @module assets-tooltips
 */

const tooltips = {
  registerAsset: "Add a new asset to the configuration management database",
  assetType: "The category of this asset (hardware, software, service)",
  assetStatus: "Current lifecycle state of this asset",
  linkAssetToIssue: "Associate this asset with a related issue",
  assetDependencies: "Other assets this item depends on or supports",
  assetOwner: "The person or team responsible for this asset",
} as const;

export default tooltips;
