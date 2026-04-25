// ─── Stats aggregation service ──────────────────────────────────────────────
import { db } from "../config/firebase";
import type { DashboardStats, WardStats, Pothole, Ward, Locality, WeatherSnapshot } from "../models/types";
import { distanceMeters } from "../utils/geohash";
import { isSlaBreached, getDaysOpen } from "../utils/sla";

export async function getDashboardStats(userLat?: number, userLng?: number): Promise<DashboardStats> {
  const snap = await db.collection("potholes").get();
  const potholes = snap.docs.map((d) => d.data() as Pothole);
  const now = new Date();

  const activeCount = potholes.filter((p) => p.status === "reported").length;
  const dangerCount = potholes.filter((p) => p.severity === "high" || p.severity === "critical").length;
  const fixedThisMonth = potholes.filter((p) => {
    if (p.status !== "repaired" || !p.repairedAt) return false;
    const d = new Date(p.repairedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  let nearYouCount = 0;
  if (userLat && userLng) {
    nearYouCount = potholes.filter(
      (p) => p.status !== "repaired" && distanceMeters(p.position, { lat: userLat, lng: userLng }) < 1000
    ).length;
  }

  const breachedCount = potholes.filter((p) => p.status !== "repaired" && isSlaBreached(p.reportedAt, p.slaHours, p.status)).length;
  const reoccurredCount = potholes.filter((p) => p.reoccurred).length;
  const totalFixed = potholes.filter((p) => p.status === "repaired").length;
  const improperRepairPercent = totalFixed === 0 ? 0 : Math.round((reoccurredCount / totalFixed) * 100);

  return { activeCount, dangerCount, fixedThisMonth, nearYouCount, breachedCount, reoccurredCount, totalFixed, improperRepairPercent, totalPotholes: potholes.length };
}

export async function getWardStats(wardId: string): Promise<WardStats> {
  const snap = await db.collection("potholes").where("wardId", "==", wardId).get();
  const items = snap.docs.map((d) => d.data() as Pothole);
  const open = items.filter((p) => p.status !== "repaired");
  const fixed = items.filter((p) => p.status === "repaired");
  const breached = open.filter((p) => isSlaBreached(p.reportedAt, p.slaHours, p.status)).length;
  const avgResolveDays = fixed.length === 0 ? 0 : Math.round((fixed.reduce((a, p) => a + getDaysOpen(p.reportedAt), 0) / fixed.length) * 10) / 10;
  const fixRate = items.length === 0 ? 0 : fixed.length / items.length;
  const perf = Math.max(0, Math.min(100, Math.round(fixRate * 100 - breached * 2)));
  return { wardId, total: items.length, open: open.length, fixed: fixed.length, breached, avgResolveDays, perf };
}

export async function getWardRankings(): Promise<Array<Ward & WardStats>> {
  const wardsSnap = await db.collection("wards").get();
  const wards = wardsSnap.docs.map((d) => d.data() as Ward);
  const rankings = await Promise.all(wards.map(async (w) => ({ ...w, ...(await getWardStats(w.id)) })));
  return rankings.sort((a, b) => b.perf - a.perf);
}

export async function getLocalityHealthScore(localityId: string): Promise<number> {
  const locDoc = await db.collection("localities").doc(localityId).get();
  if (!locDoc.exists) return 0;
  const loc = locDoc.data() as Locality;
  const snap = await db.collection("potholes").where("localityId", "==", localityId).get();
  const items = snap.docs.map((d) => d.data() as Pothole).filter((p) => p.status !== "repaired");
  if (items.length === 0) return 100;
  const avgSev = items.reduce((a, p) => a + p.severityScore, 0) / items.length;
  const overdue = items.filter((p) => isSlaBreached(p.reportedAt, p.slaHours, p.status)).length;
  const weatherDoc = await db.collection("config").doc("weather").get();
  const weather = weatherDoc.exists ? (weatherDoc.data() as WeatherSnapshot) : null;
  const rainPenalty = weather?.monsoonRiskZones?.includes(localityId) ? 8 : 0;
  let score = 100 - items.length * 1.6 - avgSev * 0.35 - overdue * 3 - loc.trafficDensity * 0.1 - rainPenalty;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function getAllLocalitiesWithHealth() {
  const locSnap = await db.collection("localities").get();
  const localities = locSnap.docs.map((d) => d.data() as Locality);
  const potSnap = await db.collection("potholes").get();
  const allPotholes = potSnap.docs.map((d) => d.data() as Pothole);
  return await Promise.all(localities.map(async (loc) => {
    const healthScore = await getLocalityHealthScore(loc.id);
    const locP = allPotholes.filter((p) => p.localityId === loc.id);
    const fixed = locP.filter((p) => p.status === "repaired").length;
    const resolutionRate = locP.length === 0 ? 0 : Math.round((fixed / locP.length) * 100);
    return { ...loc, healthScore, potholeCount: locP.length, resolutionRate };
  }));
}
