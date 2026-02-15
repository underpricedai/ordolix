/**
 * Tooltip content dictionary for the Incidents module.
 * @module incidents-tooltips
 */

const tooltips = {
  declareIncident: "Create a new incident and begin the response process",
  severity: "The impact level of this incident (SEV-1 to SEV-4)",
  incidentCommander: "The person leading the incident response effort",
  statusUpdate: "Post a progress update to stakeholders",
  postmortem: "Document root cause and action items after resolution",
  affectedServices: "Services or assets impacted by this incident",
} as const;

export default tooltips;
