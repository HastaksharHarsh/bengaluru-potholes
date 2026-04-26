// ─── Weekly report service ──────────────────────────────────────────────────
import { db } from "../config/firebase";
import { generateWeeklyReportSummary, generateAIInsights } from "./ai.service";
import type { Pothole, WeeklyReport, Locality, Ward } from "../models/types";
import { isSlaBreached } from "../utils/sla";

export async function generateWeeklyReport(weekName: string): Promise<WeeklyReport> {
  const potSnap = await db.collection("potholes").get();
  const potholes = potSnap.docs.map((d: any) => d.data() as Pothole);
  const locSnap = await db.collection("localities").get();
  const localities = locSnap.docs.map((d: any) => d.data() as Locality);
  const wardSnap = await db.collection("wards").get();
  const wards = wardSnap.docs.map((d: any) => d.data() as Ward);

  const totalReported = potholes.length;
  const fixedPotholes = potholes.filter((p: Pothole) => p.status === "repaired");
  const totalFixed = fixedPotholes.length;
  const pending = potholes.filter((p: Pothole) => p.status !== "repaired").length;
  const reoccurring = potholes.filter((p: Pothole) => p.reoccurred).length;
  const breachedCount = potholes.filter((p: Pothole) => p.status !== "repaired" && isSlaBreached(p.reportedAt, p.slaHours, p.status)).length;

  const severityBreakdown = {
    low: potholes.filter((p: Pothole) => p.severity === "low").length,
    medium: potholes.filter((p: Pothole) => p.severity === "medium").length,
    high: potholes.filter((p: Pothole) => p.severity === "high").length,
    critical: potholes.filter((p: Pothole) => p.severity === "critical").length,
  };

  const locStats = localities.map((l: Locality) => ({
    name: l.name,
    count: potholes.filter((p: Pothole) => p.localityId === l.id && p.status !== "repaired").length,
    fixed: potholes.filter((p: Pothole) => p.localityId === l.id && p.status === "repaired").length,
  }));

  const worstLocality = [...locStats].sort((a, b) => b.count - a.count)[0]?.name || "N/A";
  const topLocality = [...locStats].sort((a, b) => b.fixed - a.fixed)[0]?.name || "N/A";

  const wardStats = wards.map((w: Ward) => ({
    name: w.name,
    fixed: potholes.filter((p: Pothole) => p.wardId === w.id && p.status === "repaired").length,
  }));
  const bestWard = [...wardStats].sort((a, b) => b.fixed - a.fixed)[0]?.name || "N/A";

  const resolutionRate = totalReported > 0 ? (totalFixed / totalReported) * 100 : 0;
  
  let avgFixTime = 0;
  if (fixedPotholes.length > 0) {
    const totalFixDays = fixedPotholes.reduce((acc: number, p: Pothole) => acc + (p.daysOpen || 0), 0);
    avgFixTime = totalFixDays / fixedPotholes.length;
  }

  const aiSummary = await generateWeeklyReportSummary({
    totalReported, totalFixed, pending, reoccurring, severityBreakdown, topLocality, worstLocality, breachedCount,
  });

  const aiInsights = await generateAIInsights({
    totalReported, totalFixed, pending, reoccurring, avgFixTime, resolutionRate, worstLocality, bestWard, severityDistribution: severityBreakdown
  });

  const detailedTable = potholes.map((p: Pothole) => {
    const locName = localities.find((l: Locality) => l.id === p.localityId)?.name || p.localityId;
    const wardName = wards.find((w: Ward) => w.id === p.wardId)?.name || p.wardId;
    return {
      id: p.id,
      location: p.road || "Unknown",
      locality: locName,
      ward: wardName,
      reportedAt: p.reportedAt,
      status: p.status,
      daysToFix: p.status === "repaired" && p.repairedAt ? Math.round((new Date(p.repairedAt).getTime() - new Date(p.reportedAt).getTime()) / 86400000) : p.daysOpen || 0,
      severity: p.severity,
    };
  });

  const report: WeeklyReport = {
    id: `report-${Date.now()}`,
    week: weekName,
    totalReported, totalFixed, pending, reoccurring, severityBreakdown,
    topLocality, worstLocality, aiSummary, aiInsights, detailedTable,
    generatedAt: new Date().toISOString(),
  };

  await db.collection("weekly_reports").doc(report.id).set(report);
  return report;
}

export async function getWeeklyReports(): Promise<WeeklyReport[]> {
  const snap = await db.collection("weekly_reports").orderBy("generatedAt", "desc").limit(10).get();
  return snap.docs.map((d: any) => d.data() as WeeklyReport);
}

/**
 * Delete all existing weekly reports (clear stale/seeded data).
 */
export async function clearOldReports(): Promise<void> {
  const snap = await db.collection("weekly_reports").get();
  const batch = db.batch();
  snap.docs.forEach((doc: any) => batch.delete(doc.ref));
  await batch.commit();
  console.log(`🗑️  Cleared ${snap.size} old weekly reports from Firestore`);
}
