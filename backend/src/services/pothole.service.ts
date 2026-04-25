// ─── Pothole service — Firestore CRUD + business logic ──────────────────────
import { db } from "../config/firebase";
import { encodeGeohash, distanceMeters, getGeohashRanges } from "../utils/geohash";
import { getSlaHours, isSlaBreached, getDaysOpen } from "../utils/sla";
import type { Pothole, PotholeStatus, Severity, SizeBucket, Locality } from "../models/types";
import { v4 as uuidv4 } from "uuid";

const COLLECTION = "potholes";

/**
 * Create a new pothole report.
 */
export async function createPothole(data: {
  localityId: string;
  wardId: string;
  lat: number;
  lng: number;
  severity: Severity;
  severityScore: number;
  size: SizeBucket;
  road: string;
  imageUrl?: string;
  voiceNote?: string;
  reoccurred?: boolean;
  improperRepair?: boolean;
  linkedPreviousId?: string | null;
  trafficScore?: number;
  speedLimitKph?: number;
  congestionRatio?: number;
}): Promise<Pothole> {
  const id = `ph-${Date.now()}-${uuidv4().slice(0, 8)}`;
  const slaHours = getSlaHours(data.severity);
  const now = new Date().toISOString();

  const pothole: Pothole = {
    id,
    localityId: data.localityId,
    wardId: data.wardId,
    position: { lat: data.lat, lng: data.lng },
    geohash: encodeGeohash(data.lat, data.lng),
    severity: data.severity,
    severityScore: data.severityScore,
    size: data.size,
    status: "reported",
    reports: 1,
    reportedAt: now,
    daysOpen: 0,
    imageUrl: data.imageUrl,
    road: data.road || "Unknown Road",
    upvotes: 0,
    slaHours,
    slaBreached: false,
    reoccurred: data.reoccurred || false,
    improperRepair: data.improperRepair || false,
    linkedPreviousId: data.linkedPreviousId || null,
    voiceNote: data.voiceNote,
    trafficScore: data.trafficScore,
    speedLimitKph: data.speedLimitKph,
    congestionRatio: data.congestionRatio,
  };

  await db.collection(COLLECTION).doc(id).set(pothole);
  console.log(`📌 Pothole created: ${id}`);
  return pothole;
}

/**
 * Get a single pothole by ID.
 */
export async function getPotholeById(id: string): Promise<Pothole | null> {
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return enrichPothole(doc.data() as Pothole);
}

/**
 * List potholes with filters and pagination.
 */
export async function listPotholes(options: {
  limit?: number;
  offset?: number;
  severity?: Severity;
  status?: PotholeStatus;
  localityId?: string;
  wardId?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}): Promise<{ potholes: Pothole[]; total: number }> {
  let query: FirebaseFirestore.Query = db.collection(COLLECTION);

  if (options.severity) {
    query = query.where("severity", "==", options.severity);
  }
  if (options.status) {
    query = query.where("status", "==", options.status);
  }
  if (options.localityId) {
    query = query.where("localityId", "==", options.localityId);
  }
  if (options.wardId) {
    query = query.where("wardId", "==", options.wardId);
  }

  // Get total count
  const countSnap = await query.count().get();
  const total = countSnap.data().count;

  // Apply sorting
  const sortField = options.sortBy || "reportedAt";
  const sortDir = options.sortDir || "desc";
  query = query.orderBy(sortField, sortDir);

  // Apply pagination
  if (options.offset) {
    query = query.offset(options.offset);
  }
  query = query.limit(options.limit || 20);

  const snap = await query.get();
  const potholes = snap.docs.map((doc) => enrichPothole(doc.data() as Pothole));

  return { potholes, total };
}

/**
 * Get potholes for map rendering (lightweight — only coords + severity + status).
 */
export async function getMapPotholes(): Promise<
  Array<{
    id: string;
    position: { lat: number; lng: number };
    severity: Severity;
    severityScore: number;
    status: PotholeStatus;
    size: SizeBucket;
    road: string;
    localityId: string;
    reports: number;
    daysOpen: number;
    slaBreached: boolean;
    reoccurred: boolean;
  }>
> {
  const snap = await db.collection(COLLECTION).get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: d.id,
      position: d.position,
      severity: d.severity,
      severityScore: d.severityScore,
      status: d.status,
      size: d.size,
      road: d.road,
      localityId: d.localityId,
      reports: d.reports || 1,
      daysOpen: d.daysOpen || 0,
      slaBreached: d.slaBreached || false,
      reoccurred: d.reoccurred || false,
    };
  });
}

/**
 * Find potholes near a given location (for deduplication).
 */
export async function findNearbyPotholes(
  lat: number,
  lng: number,
  radiusMeters: number = 30
): Promise<Pothole[]> {
  const ranges = getGeohashRanges(lat, lng, radiusMeters);
  const allResults: Pothole[] = [];

  // Query each geohash range
  for (const range of ranges) {
    const snap = await db
      .collection(COLLECTION)
      .where("geohash", ">=", range.start)
      .where("geohash", "<=", range.end)
      .get();

    for (const doc of snap.docs) {
      const pothole = doc.data() as Pothole;
      // Final distance filter (geohash is approximate)
      const dist = distanceMeters(pothole.position, { lat, lng });
      if (dist <= radiusMeters) {
        allResults.push(enrichPothole(pothole));
      }
    }
  }

  // Deduplicate (same pothole might appear from multiple geohash ranges)
  const seen = new Set<string>();
  return allResults.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

/**
 * Update pothole status (e.g., mark repaired).
 */
export async function updatePotholeStatus(
  id: string,
  status: PotholeStatus
): Promise<Pothole | null> {
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const updates: Partial<Pothole> = { status };
  if (status === "repaired") {
    updates.repairedAt = new Date().toISOString();
  }

  await ref.update(updates);
  const updated = await ref.get();
  return enrichPothole(updated.data() as Pothole);
}

/**
 * Increment upvote count and slightly increase severity for a pothole.
 */
export async function upvotePothole(id: string): Promise<{ upvotes: number; severityScore: number } | null> {
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const current = doc.data() as Pothole;
  const newUpvotes = (current.upvotes || 0) + 1;
  const newReports = (current.reports || 1) + 1;

  // Slightly increase severity score to indicate more traffic/reports (max 100)
  let newScore = Math.min(100, (current.severityScore || 0) + 2);

  // Update severity category if score crosses threshold
  let newSeverity: Severity = current.severity;
  if (newScore >= 80) newSeverity = "critical";
  else if (newScore >= 60) newSeverity = "high";
  else if (newScore >= 40) newSeverity = "medium";

  await ref.update({
    upvotes: newUpvotes,
    reports: newReports,
    severityScore: newScore,
    severity: newSeverity
  });

  return { upvotes: newUpvotes, severityScore: newScore };
}

/**
 * Get all potholes (used by stats/aggregation).
 */
export async function getAllPotholes(): Promise<Pothole[]> {
  const snap = await db.collection(COLLECTION).get();
  return snap.docs.map((doc) => enrichPothole(doc.data() as Pothole));
}

// ── Internal: Enrich a pothole with computed fields ──────────────────────────
function enrichPothole(p: Pothole): Pothole {
  return {
    ...p,
    daysOpen: getDaysOpen(p.reportedAt),
    slaBreached: isSlaBreached(p.reportedAt, p.slaHours, p.status),
  };
}
