// ─── SLA calculation helpers ─────────────────────────────────────────────────
import type { Severity } from "../models/types";

/**
 * Get the SLA deadline (in hours) based on severity.
 * Critical: 48h, High: 120h (5d), Medium/Low: 240h (10d)
 */
export function getSlaHours(severity: Severity): number {
  switch (severity) {
    case "critical":
      return 48;
    case "high":
      return 120;
    case "medium":
    case "low":
    default:
      return 240;
  }
}

/**
 * Check if a pothole has breached its SLA deadline.
 */
export function isSlaBreached(reportedAt: string, slaHours: number, status: string): boolean {
  if (status === "repaired") return false;
  const reported = new Date(reportedAt).getTime();
  const now = Date.now();
  const elapsedHours = (now - reported) / (1000 * 60 * 60);
  return elapsedHours > slaHours;
}

/**
 * Calculate how many days a pothole has been open.
 */
export function getDaysOpen(reportedAt: string): number {
  const reported = new Date(reportedAt).getTime();
  const now = Date.now();
  return Math.floor((now - reported) / (1000 * 60 * 60 * 24));
}
