/**
 * Tooltip content dictionary for the Approvals module.
 * @module approvals-tooltips
 */

const tooltips = {
  requestApproval: "Submit this item for review and approval",
  approveItem: "Grant approval and advance to the next stage",
  rejectItem: "Reject and return the item with feedback",
  approvalChain: "The ordered sequence of required approvers",
  delegateApproval: "Assign your approval authority to another user",
} as const;

export default tooltips;
