/**
 * PWA Icon Generator for Ordolix
 *
 * @description Generates all required PWA icon sizes from the source logo.
 * Produces standard icons (192x192, 512x512) and maskable variants with
 * 10% safe-zone padding on a brand-colored background (#1a365d).
 *
 * @example
 *   npx tsx scripts/generate-pwa-icons.ts
 *   # or
 *   npx ts-node scripts/generate-pwa-icons.ts
 */

import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const PUBLIC_DIR = path.resolve(__dirname, "..", "public");
const ICONS_DIR = path.join(PUBLIC_DIR, "icons");
const SOURCE_ICON = path.join(PUBLIC_DIR, "logo-icon.png");

/** Ordolix brand primary color */
const BRAND_COLOR = { r: 26, g: 54, b: 93, alpha: 1 } as const;

interface IconSpec {
  size: number;
  filename: string;
  maskable: boolean;
}

const ICON_SPECS: IconSpec[] = [
  { size: 192, filename: "icon-192.png", maskable: false },
  { size: 512, filename: "icon-512.png", maskable: false },
  { size: 192, filename: "icon-maskable-192.png", maskable: true },
  { size: 512, filename: "icon-maskable-512.png", maskable: true },
];

/**
 * Generates a standard (non-maskable) PWA icon at the specified size.
 */
async function generateStandardIcon(
  size: number,
  outputPath: string,
): Promise<void> {
  await sharp(SOURCE_ICON)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outputPath);
}

/**
 * Generates a maskable PWA icon with 10% safe-zone padding.
 *
 * @description Maskable icons require that all important content fits within
 * the inner 80% circle (the "safe zone"). This function adds 10% padding on
 * each side with the brand background color.
 */
async function generateMaskableIcon(
  size: number,
  outputPath: string,
): Promise<void> {
  const padding = Math.round(size * 0.1);
  const innerSize = size - padding * 2;

  const resized = await sharp(SOURCE_ICON)
    .resize(innerSize, innerSize, { fit: "contain", background: BRAND_COLOR })
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BRAND_COLOR,
    },
  })
    .composite([{ input: resized, top: padding, left: padding }])
    .png()
    .toFile(outputPath);
}

/**
 * Generates an Apple Touch Icon (180x180) from the source logo.
 */
async function generateAppleTouchIcon(): Promise<void> {
  const outputPath = path.join(ICONS_DIR, "apple-touch-icon.png");
  await sharp(SOURCE_ICON)
    .resize(180, 180, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(outputPath);
  console.log(`  Created: ${outputPath}`);
}

async function main(): Promise<void> {
  // Verify source icon exists
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error(`Source icon not found: ${SOURCE_ICON}`);
    console.error("Place a logo-icon.png in the public/ directory first.");
    process.exit(1);
  }

  // Ensure output directory exists
  fs.mkdirSync(ICONS_DIR, { recursive: true });

  console.log("Generating PWA icons from:", SOURCE_ICON);
  console.log("");

  for (const spec of ICON_SPECS) {
    const outputPath = path.join(ICONS_DIR, spec.filename);
    if (spec.maskable) {
      await generateMaskableIcon(spec.size, outputPath);
    } else {
      await generateStandardIcon(spec.size, outputPath);
    }
    console.log(
      `  Created: ${spec.filename} (${spec.size}x${spec.size}${spec.maskable ? ", maskable" : ""})`,
    );
  }

  // Also generate apple touch icon
  await generateAppleTouchIcon();

  console.log("");
  console.log("All PWA icons generated successfully.");
}

main().catch((err) => {
  console.error("Failed to generate icons:", err);
  process.exit(1);
});
