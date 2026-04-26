import dotenv from "dotenv";
dotenv.config();

import { db } from "../config/firebase";
import { encodeGeohash } from "../utils/geohash";
import { getSlaHours } from "../utils/sla";
import type { Ward, Locality, Pothole, Severity, SizeBucket, PotholeStatus } from "../models/types";

// Target Localities: Whitefield, Koramangala, Indiranagar, Yelahanka, Electronic City
const TARGET_LOCALITIES = [
  { id: "loc-whitefield", name: "Whitefield", wardId: "w-150", center: { lat: 12.9698, lng: 77.7500 }, isArterial: true },
  { id: "loc-koramangala", name: "Koramangala", wardId: "w-112", center: { lat: 12.9352, lng: 77.6245 }, isArterial: false },
  { id: "loc-indiranagar", name: "Indiranagar", wardId: "w-097", center: { lat: 12.9784, lng: 77.6408 }, isArterial: false },
  { id: "loc-yelahanka", name: "Yelahanka", wardId: "w-006", center: { lat: 13.1007, lng: 77.5963 }, isArterial: false },
  { id: "loc-ecity", name: "Electronic City", wardId: "w-198", center: { lat: 12.8452, lng: 77.6602 }, isArterial: true }
];

const ROADS: Record<string, string[]> = {
  "loc-whitefield": ["ITPL Main Rd", "Whitefield Main Rd", "Borewell Rd"],
  "loc-koramangala": ["80 Feet Rd", "Sony World Junction", "5th Block Main"],
  "loc-indiranagar": ["100 Feet Rd", "CMH Rd", "12th Main"],
  "loc-yelahanka": ["Yelahanka Main Rd", "NH-44 Service Rd"],
  "loc-ecity": ["Hosur Rd (E-City)", "Phase 1 Main", "Infosys Gate Rd"],
};

function jitter(value: number, range = 0.015): number {
  return value + (Math.random() - 0.5) * range;
}

function generatePotholes(): Pothole[] {
  const out: Pothole[] = [];
  let i = 0;
  
  // Generate 150 realistic records (30 per locality)
  for (const loc of TARGET_LOCALITIES) {
    const roads = ROADS[loc.id];
    for (let n = 0; n < 30; n++) {
      // Within last 30 days
      const daysOpen = Math.floor(Math.random() * 30);
      const reportedAt = new Date(Date.now() - daysOpen * 86400000).toISOString();
      
      // Mix: reported (60%), repaired (40%)
      const status: PotholeStatus = Math.random() > 0.6 ? "repaired" : "reported";
      const repairedAt = status === "repaired" 
        ? new Date(Date.now() - Math.floor(Math.random() * daysOpen) * 86400000).toISOString() 
        : undefined;

      const severityScore = Math.floor(Math.random() * 60) + 40; // 40-100
      let severity: Severity = "low";
      if (severityScore >= 80) severity = "critical";
      else if (severityScore >= 60) severity = "high";
      else if (severityScore >= 40) severity = "medium";

      const lat = jitter(loc.center.lat);
      const lng = jitter(loc.center.lng);
      const isReoccurrence = status === "reported" && Math.random() > 0.85;

      out.push({
        id: `ph-seed-${Date.now()}-${++i}`,
        localityId: loc.id,
        wardId: loc.wardId,
        position: { lat, lng },
        geohash: encodeGeohash(lat, lng),
        severity,
        severityScore,
        size: severity === "critical" ? "large" : "medium",
        status,
        reports: 1 + Math.floor(Math.random() * 10),
        reportedAt,
        daysOpen: status === "repaired" ? 0 : daysOpen,
        road: roads[n % roads.length],
        upvotes: Math.floor(Math.random() * 20),
        slaHours: getSlaHours(severity),
        slaBreached: status !== "repaired" && (daysOpen * 24 > getSlaHours(severity)),
        repairedAt,
        reoccurred: isReoccurrence,
        improperRepair: isReoccurrence
      });
    }
  }
  return out;
}

async function seedFirestore() {
  console.log("🌱 Starting Firestore data ingestion...");

  const potholes = generatePotholes();
  const BATCH_SIZE = 450;
  let totalSeeded = 0;

  for (let i = 0; i < potholes.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = potholes.slice(i, i + BATCH_SIZE);
    for (const p of chunk) {
      batch.set(db.collection("potholes").doc(p.id), p);
    }
    await batch.commit();
    totalSeeded += chunk.length;
    console.log(`   📦 Ingested ${totalSeeded} potholes...`);
  }

  console.log(`\n🎉 Firestore Pipeline Complete! ${totalSeeded} potholes seeded successfully.`);
  process.exit(0);
}

seedFirestore().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
