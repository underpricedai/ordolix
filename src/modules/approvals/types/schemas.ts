import { z } from "zod";

export const requestApprovalInput = z.object({
  issueId: z.string().min(1),
  approverId: z.string().min(1),
  expiresAt: z.coerce.date().optional(),
});

export type RequestApprovalInput = z.infer<typeof requestApprovalInput>;

export const decideApprovalInput = z.object({
  id: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
  comment: z.string().optional(),
});

export type DecideApprovalInput = z.infer<typeof decideApprovalInput>;

export const listApprovalsInput = z.object({
  issueId: z.string().min(1),
});

export type ListApprovalsInput = z.infer<typeof listApprovalsInput>;

export const listPendingApprovalsInput = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type ListPendingApprovalsInput = z.infer<typeof listPendingApprovalsInput>;
