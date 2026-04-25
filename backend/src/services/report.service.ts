// ─── Weekly report service ──────────────────────────────────────────────────
import { db } from "../config/firebase";
import { generateWeeklyReportSummary } from "./ai.service";
import type { Pothole, WeeklyReport, Locality } from "../models/types";
import { isSlaBreached } from "../utils/sla";

export async function generateWeeklyReport(weekName: string): Promise<WeeklyReport> {
  const potSnap = await db.collection("potholes").get();
  const potholes = potSnap.docs.map((d) => d.data() as Pothole);
  const locSnap = await db.collection("localities").get();
  const localities = locSnap.docs.map((d) => d.data() as Locality);

  const totalReported = potholes.length;
  const totalFixed = potholes.filter((p) => p.status === "repaired").length;
  const pending = potholes.filter((p) => p.status !== "repaired").length;
  const reoccurring = potholes.filter((p) => p.reoccurred).length;
  const breachedCount = potholes.filter((p) => p.status !== "repaired" && isSlaBreached(p.reportedAt, p.slaHours, p.status)).length;

  const severityBreakdown = {
    low: potholes.filter((p) => p.severity === "low").length,
    medium: potholes.filter((p) => p.severity === "medium").length,
    high: potholes.filter((p) => p.severity === "high").length,
    critical: potholes.filter((p) => p.severity === "critical").length,
  };

  const locStats = localities.map((l) => ({
    name: l.name,
    count: potholes.filter((p) => p.localityId === l.id && p.status !== "repaired").length,
    fixed: potholes.filter((p) => p.localityId === l.id && p.status === "repaired").length,
  }));

  const worstLocality = [...locStats].sort((a, b) => b.count - a.count)[0]?.name || "N/A";
  const topLocality = [...locStats].sort((a, b) => b.fixed - a.fixed)[0]?.name || "N/A";

  const aiSummary = await generateWeeklyReportSummary({
    totalReported, totalFixed, pending, reoccurring, severityBreakdown, topLocality, worstLocality, breachedCount,
  });

  const report: WeeklyReport = {
    id: `report-${Date.now()}`,
    week: weekName,
    totalReported, totalFixed, pending, reoccurring, severityBreakdown,
    topLocality, worstLocality, aiSummary,
    generatedAt: new Date().toISOString(),
  };

  await db.collection("weekly_reports").doc(report.id).set(report);
  return report;
}

export async function getWeeklyReports(): Promise<WeeklyReport[]> {
  const snap = await db.collection("weekly_reports").orderBy("generatedAt", "desc").limit(10).get();
  return snap.docs.map((d) => d.data() as WeeklyReport);
}

/**
 * Delete all existing weekly reports (clear stale/seeded data).
 */
export async function clearOldReports(): Promise<void> {
  const snap = await db.collection("weekly_reports").get();
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  console.log(`🗑️  Cleared ${snap.size} old weekly reports from Firestore`);
}
