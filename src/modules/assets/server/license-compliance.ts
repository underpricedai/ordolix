/**
 * License compliance and renewal alert service.
 *
 * @description Pure compliance calculation functions and dashboard
 * aggregation queries for software license management.
 *
 * @module license-compliance
 */

import type { PrismaClient } from "@prisma/client";
import { NotFoundError } from "@/server/lib/errors";

/** Compliance status for a single license */
export type ComplianceStatus = "compliant" | "over_deployed" | "under_utilized";

/** Compliance check result */
export interface ComplianceResult {
  status: ComplianceStatus;
  total: number;
  used: number;
  available: number;
}

/**
 * Calculates compliance status from entitlement and allocation counts.
 *
 * @description Pure function with no side effects.
 * - over_deployed: used > total
 * - under_utilized: used < total * 0.5
 * - compliant: otherwise
 *
 * @param totalEntitlements - Total number of entitlements on the license
 * @param activeAllocations - Number of active (non-revoked) allocations
 * @returns Compliance result with status and counts
 */
export function checkCompliance(
  totalEntitlements: number,
  activeAllocations: number,
): ComplianceResult {
  let status: ComplianceStatus;

  if (activeAllocations > totalEntitlements) {
    status = "over_deployed";
  } else if (activeAllocations < totalEntitlements * 0.5) {
    status = "under_utilized";
  } else {
    status = "compliant";
  }

  return {
    status,
    total: totalEntitlements,
    used: activeAllocations,
    available: Math.max(0, totalEntitlements - activeAllocations),
  };
}

/**
 * Gets compliance status for a single license by querying the DB.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param licenseId - License ID to check
 * @returns Compliance result for the specified license
 * @throws NotFoundError if license does not exist
 */
export async function getLicenseCompliance(
  db: PrismaClient,
  organizationId: string,
  licenseId: string,
): Promise<ComplianceResult> {
  const license = await db.softwareLicense.findFirst({
    where: { id: licenseId, organizationId },
  });
  if (!license) {
    throw new NotFoundError("SoftwareLicense", licenseId);
  }

  const activeCount = await db.softwareLicenseAllocation.count({
    where: { licenseId, revokedAt: null },
  });

  return checkCompliance(license.totalEntitlements, activeCount);
}

/** Compliance dashboard summary */
export interface ComplianceDashboard {
  totalLicenses: number;
  compliant: number;
  overDeployed: number;
  underUtilized: number;
  totalCost: number;
  expiringWithin30Days: number;
}

/**
 * Generates an organization-wide compliance dashboard.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @returns Dashboard summary with compliance counts and cost totals
 */
export async function getComplianceDashboard(
  db: PrismaClient,
  organizationId: string,
): Promise<ComplianceDashboard> {
  const licenses = await db.softwareLicense.findMany({
    where: { organizationId, status: "active" },
    include: {
      _count: {
        select: {
          allocations: {
            where: { revokedAt: null },
          },
        },
      },
    },
  });

  let compliant = 0;
  let overDeployed = 0;
  let underUtilized = 0;
  let totalCost = 0;

  for (const license of licenses) {
    const result = checkCompliance(
      license.totalEntitlements,
      license._count.allocations,
    );
    switch (result.status) {
      case "compliant":
        compliant++;
        break;
      case "over_deployed":
        overDeployed++;
        break;
      case "under_utilized":
        underUtilized++;
        break;
    }

    if (license.purchasePrice) {
      totalCost += Number(license.purchasePrice);
    }
  }

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringWithin30Days = await db.softwareLicense.count({
    where: {
      organizationId,
      status: "active",
      expirationDate: {
        lte: thirtyDaysFromNow,
        gte: new Date(),
      },
    },
  });

  return {
    totalLicenses: licenses.length,
    compliant,
    overDeployed,
    underUtilized,
    totalCost,
    expiringWithin30Days,
  };
}

/** Renewal alert item */
export interface RenewalAlert {
  id: string;
  name: string;
  vendor: string | null;
  expirationDate: Date | null;
  renewalDate: Date | null;
  autoRenew: boolean;
  renewalCost: number | null;
}

/**
 * Gets licenses expiring or renewing within N days.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param daysAhead - Number of days to look ahead
 * @returns Array of licenses needing attention
 */
export async function getRenewalAlerts(
  db: PrismaClient,
  organizationId: string,
  daysAhead: number,
): Promise<RenewalAlert[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const now = new Date();

  const licenses = await db.softwareLicense.findMany({
    where: {
      organizationId,
      status: "active",
      OR: [
        {
          expirationDate: { lte: futureDate, gte: now },
        },
        {
          renewalDate: { lte: futureDate, gte: now },
        },
      ],
    },
    orderBy: { expirationDate: "asc" as const },
    select: {
      id: true,
      name: true,
      vendor: true,
      expirationDate: true,
      renewalDate: true,
      autoRenew: true,
      renewalCost: true,
    },
  });

  return licenses.map((l) => ({
    ...l,
    renewalCost: l.renewalCost ? Number(l.renewalCost) : null,
  }));
}
