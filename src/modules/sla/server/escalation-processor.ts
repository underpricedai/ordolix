/**
 * SLA escalation processor.
 *
 * @description Evaluates escalation rules on SLA instances that are
 * approaching breach. When a threshold is crossed, triggers notifications.
 */
import type { PrismaClient } from "@prisma/client";

export interface EscalationRule {
  thresholdPercent: number;
  action: "notify" | "reassign";
  target: string; // userId or groupId
}

/**
 * Check all active SLA instances for upcoming breaches and trigger escalations.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization to check
 * @returns Array of triggered escalation actions
 */
export async function processEscalations(
  db: PrismaClient,
  organizationId: string,
) {
  const now = new Date();

  // Find active SLA instances with breach times
  const instances = await db.sLAInstance.findMany({
    where: {
      organizationId,
      status: "active",
      breachTime: { not: null },
    },
    include: {
      slaConfig: true,
      issue: { select: { id: true, key: true, summary: true, assigneeId: true } },
    },
  });

  const triggered: Array<{
    instanceId: string;
    issueKey: string;
    rule: EscalationRule;
    percentElapsed: number;
  }> = [];

  for (const instance of instances) {
    if (!instance.breachTime) continue;

    const totalMs = instance.breachTime.getTime() - instance.startedAt.getTime();
    const elapsedMs = now.getTime() - instance.startedAt.getTime();
    const percentElapsed = totalMs > 0 ? Math.round((elapsedMs / totalMs) * 100) : 0;

    // Parse escalation rules from config
    const rules = (instance.slaConfig.escalationRules as unknown as EscalationRule[]) ?? [];

    for (const rule of rules) {
      if (percentElapsed >= rule.thresholdPercent) {
        triggered.push({
          instanceId: instance.id,
          issueKey: instance.issue.key,
          rule,
          percentElapsed,
        });
      }
    }
  }

  return triggered;
}
