/**
 * Tooltip content dictionary for the Notifications module.
 * @module notifications-tooltips
 */

const tooltips = {
  notificationPreferences: "Choose which events trigger notifications",
  markAsRead: "Dismiss this notification from your unread list",
  muteThread: "Stop receiving notifications for this conversation",
  deliveryChannel: "Where notifications are sent (in-app, email, or both)",
  notificationDigest: "Receive a periodic summary instead of instant alerts",
} as const;

export default tooltips;
