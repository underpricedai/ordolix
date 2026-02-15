/**
 * Tooltip content dictionary for the Retrospectives module.
 * @module retrospectives-tooltips
 */

const tooltips = {
  startRetrospective: "Begin a new retrospective session for the team",
  addFeedback: "Submit a comment under the selected category",
  voteOnItem: "Upvote items you think are most important to discuss",
  actionItem: "A concrete task created from retrospective discussion",
  retrospectiveFormat: "The template structure (Start/Stop/Continue, 4Ls, etc.)",
} as const;

export default tooltips;
