/**
 * Tooltip content dictionary for the Dashboards module.
 * @module dashboards-tooltips
 */

const tooltips = {
  createDashboard: "Build a new dashboard with customizable gadgets",
  addGadget: "Place a chart, table, or metric widget on this dashboard",
  shareDashboard: "Grant other users or teams access to this dashboard",
  refreshInterval: "How often gadget data is automatically refreshed",
  dashboardLayout: "Arrange and resize gadgets on the dashboard grid",
  filterGadget: "Narrow gadget data using a saved filter or AQL query",
} as const;

export default tooltips;
