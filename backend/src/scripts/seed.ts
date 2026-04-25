// ─── Database seed script ───────────────────────────────────────────────────
// Seeds Firestore with wards, localities, weather config, and synthetic potholes.
// Run: npm run seed
import dotenv from "dotenv";
dotenv.config();

import { db } from "../config/firebase";
import { encodeGeohash } from "../utils/geohash";
import { getSlaHours } from "../utils/sla";
import type { Ward, Locality, Pothole, Severity, SizeBucket, PotholeStatus, WeatherSnapshot } from "../models/types";

// ── Ward data (matching frontend) ──────────────────────────────────────────
const wards: Ward[] = [
  { id: "w-150", number: 150, name: "Whitefield", zone: "Mahadevapura", engineer: "Eng. R. Kumar", contact: "+91 80 2841 1101", mla: "Sharath Bachhe Gowda", constituency: "Mahadevapura" },
  { id: "w-117", number: 117, name: "Hoodi", zone: "Mahadevapura", engineer: "Eng. S. Reddy", contact: "+91 80 2841 1102", mla: "Sharath Bachhe Gowda", constituency: "Mahadevapura" },
  { id: "w-080", number: 80, name: "Jayanagar", zone: "South", engineer: "Eng. M. Iyer", contact: "+91 80 2659 4421", mla: "C. K. Ramamurthy", constituency: "Jayanagar" },
  { id: "w-072", number: 72, name: "Shanthinagar", zone: "South", engineer: "Eng. P. Nair", contact: "+91 80 2659 4422", mla: "N. A. Haris", constituency: "Shanti Nagar" },
  { id: "w-176", number: 176, name: "Bommanahalli", zone: "Bommanahalli", engineer: "Eng. K. Murthy", contact: "+91 80 2573 8801", mla: "Satish Reddy", constituency: "Bommanahalli" },
  { id: "w-189", number: 189, name: "HSR Layout", zone: "Bommanahalli", engineer: "Eng. A. Singh", contact: "+91 80 2573 8802", mla: "Satish Reddy", constituency: "Bommanahalli" },
  { id: "w-097", number: 97, name: "Indiranagar", zone: "East", engineer: "Eng. V. Rao", contact: "+91 80 2521 6601", mla: "Rizwan Arshad", constituency: "Shivajinagar" },
  { id: "w-112", number: 112, name: "Koramangala", zone: "East", engineer: "Eng. D. Bhat", contact: "+91 80 2521 6602", mla: "Ramalinga Reddy", constituency: "BTM Layout" },
  { id: "w-006", number: 6, name: "Yelahanka Satellite Town", zone: "Yelahanka", engineer: "Eng. T. Gowda", contact: "+91 80 2856 3301", mla: "S. R. Vishwanath", constituency: "Yelahanka" },
  { id: "w-198", number: 198, name: "Electronic City", zone: "Bommanahalli", engineer: "Eng. L. Pillai", contact: "+91 80 2852 7701", mla: "M. Krishnappa", constituency: "Bengaluru South" },
];

// ── Locality data ──────────────────────────────────────────────────────────
const localities: Locality[] = [
  { id: "loc-whitefield", name: "Whitefield", nameKn: "ವೈಟ್‌ಫೀಲ್ಡ್", wardId: "w-150", center: { lat: 12.9698, lng: 77.7500 }, trafficDensity: 92, isArterial: true },
  { id: "loc-orr", name: "Outer Ring Road (Marathahalli)", nameKn: "ಔಟರ್ ರಿಂಗ್ ರೋಡ್", wardId: "w-117", center: { lat: 12.9569, lng: 77.7011 }, trafficDensity: 98, isArterial: true },
  { id: "loc-silkboard", name: "Silk Board", nameKn: "ಸಿಲ್ಕ್ ಬೋರ್ಡ್", wardId: "w-176", center: { lat: 12.9176, lng: 77.6228 }, trafficDensity: 99, isArterial: true },
  { id: "loc-ecity", name: "Electronic City", nameKn: "ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ", wardId: "w-198", center: { lat: 12.8452, lng: 77.6602 }, trafficDensity: 95, isArterial: true },
  { id: "loc-koramangala", name: "Koramangala", nameKn: "ಕೋರಮಂಗಲ", wardId: "w-112", center: { lat: 12.9352, lng: 77.6245 }, trafficDensity: 88, isArterial: false },
  { id: "loc-indiranagar", name: "Indiranagar", nameKn: "ಇಂದಿರಾನಗರ", wardId: "w-097", center: { lat: 12.9784, lng: 77.6408 }, trafficDensity: 85, isArterial: false },
  { id: "loc-hsr", name: "HSR Layout", nameKn: "ಎಚ್‌ಎಸ್‌ಆರ್ ಲೇಔಟ್", wardId: "w-189", center: { lat: 12.9082, lng: 77.6476 }, trafficDensity: 78, isArterial: false },
  { id: "loc-jayanagar", name: "Jayanagar", nameKn: "ಜಯನಗರ", wardId: "w-080", center: { lat: 12.9250, lng: 77.5938 }, trafficDensity: 72, isArterial: false },
  { id: "loc-yelahanka", name: "Yelahanka", nameKn: "ಯಲಹಂಕ", wardId: "w-006", center: { lat: 13.1007, lng: 77.5963 }, trafficDensity: 60, isArterial: false },
  { id: "loc-shanthinagar", name: "Shanthinagar", nameKn: "ಶಾಂತಿನಗರ", wardId: "w-072", center: { lat: 12.9594, lng: 77.6010 }, trafficDensity: 70, isArterial: false },
];

const ROADS: Record<string, string[]> = {
  "loc-whitefield": ["ITPL Main Rd", "Whitefield Main Rd", "Borewell Rd", "Hagadur Rd"],
  "loc-orr": ["Outer Ring Road", "Marathahalli Bridge", "Sarjapur Junction"],
  "loc-silkboard": ["Hosur Rd", "Silk Board Junction", "BTM Layout Main"],
  "loc-ecity": ["Hosur Rd (E-City)", "Phase 1 Main", "Infosys Gate Rd"],
  "loc-koramangala": ["80 Feet Rd", "Sony World Junction", "5th Block Main"],
  "loc-indiranagar": ["100 Feet Rd", "CMH Rd", "12th Main"],
  "loc-hsr": ["27th Main", "Sector 1 Rd", "Agara Junction"],
  "loc-jayanagar": ["11th Main", "4th Block Rd", "Jayanagar Shopping Complex Rd"],
  "loc-yelahanka": ["Yelahanka Main Rd", "NH-44 Service Rd"],
  "loc-shanthinagar": ["Richmond Rd", "Double Rd", "Lalbagh Rd"],
};

const weather: WeatherSnapshot = {
  rainfallMm: 42,
  forecast: "heavy",
  monsoonRiskZones: ["loc-orr", "loc-silkboard", "loc-koramangala", "loc-whitefield"],
};

function jitter(value: number, range = 0.012): number {
  return value + (Math.random() - 0.5) * range;
}

function pickSeverity(traffic: number, isArterial: boolean, days: number): { severity: Severity; score: number } {
  let score = traffic * 0.4 + (isArterial ? 30 : 10) + days * 1.2;
  score = Math.min(100, Math.round(score));
  let severity: Severity = "low";
  if (score >= 80) severity = "critical";
  else if (score >= 60) severity = "high";
  else if (score >= 40) severity = "medium";
  return { severity, score };
}

function generatePotholes(): Pothole[] {
  const out: Pothole[] = [];
  let i = 0;
  for (const loc of localities) {
    const count = Math.round(4 + (loc.trafficDensity / 100) * 14);
    const roads = ROADS[loc.id] || ["Main Rd"];
    for (let n = 0; n < count; n++) {
      const days = Math.floor(Math.random() * 18);
      const { severity, score } = pickSeverity(loc.trafficDensity, loc.isArterial, days);
      const sizeRoll = Math.random();
      const size: SizeBucket = sizeRoll > 0.7 ? "large" : sizeRoll > 0.35 ? "medium" : "small";
      const slaHours = getSlaHours(severity);
      const slaBreached = days * 24 > slaHours && severity !== "low";
      const statusRoll = Math.random();
      const status: PotholeStatus = statusRoll > 0.85 ? "repaired" : statusRoll > 0.65 ? "in_progress" : statusRoll > 0.3 ? "verified" : "reported";
      const lat = jitter(loc.center.lat);
      const lng = jitter(loc.center.lng);

      out.push({
        id: `ph-${++i}`,
        localityId: loc.id,
        wardId: loc.wardId,
        position: { lat, lng },
        geohash: encodeGeohash(lat, lng),
        severity, severityScore: score, size, status,
        reports: 1 + Math.floor(Math.random() * 24),
        reportedAt: new Date(Date.now() - days * 86400000).toISOString(),
        daysOpen: days,
        road: roads[n % roads.length],
        upvotes: Math.floor(Math.random() * 60),
        slaHours, slaBreached,
        repairedAt: status === "repaired" ? new Date(Date.now() - Math.floor(Math.random() * days) * 86400000).toISOString() : undefined,
      });
    }
  }
  return out;
}

async function seed() {
  console.log("🌱 Starting database seed...\n");

  // Seed wards
  console.log("📌 Seeding wards...");
  const wardBatch = db.batch();
  for (const w of wards) {
    wardBatch.set(db.collection("wards").doc(w.id), w);
  }
  await wardBatch.commit();
  console.log(`   ✅ ${wards.length} wards seeded`);

  // Seed localities
  console.log("📌 Seeding localities...");
  const locBatch = db.batch();
  for (const l of localities) {
    locBatch.set(db.collection("localities").doc(l.id), l);
  }
  await locBatch.commit();
  console.log(`   ✅ ${localities.length} localities seeded`);

  // Seed weather config
  console.log("📌 Seeding weather config...");
  await db.collection("config").doc("weather").set(weather);
  console.log("   ✅ Weather config seeded");

  // Seed potholes (batches of 500 — Firestore limit)
  console.log("📌 Generating and seeding potholes...");
  const potholes = generatePotholes();
  const BATCH_SIZE = 450;
  for (let i = 0; i < potholes.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = potholes.slice(i, i + BATCH_SIZE);
    for (const p of chunk) {
      batch.set(db.collection("potholes").doc(p.id), p);
    }
    await batch.commit();
    console.log(`   📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} potholes`);
  }
  console.log(`   ✅ ${potholes.length} potholes seeded`);

  // Seed mock past reports
  console.log("📌 Seeding past weekly reports...");
  const pastReports = [
    { id: "rep-1", week: "Week 1 April", totalReported: 45, totalFixed: 12, pending: 33, reoccurring: 4, severityBreakdown: { low: 10, medium: 15, high: 15, critical: 5 }, topLocality: "Jayanagar", worstLocality: "Whitefield", aiSummary: "Early April saw moderate reporting volume. Jayanagar teams demonstrated high efficiency in closing minor reports.", generatedAt: "2026-04-07T10:00:00Z" },
    { id: "rep-2", week: "Week 2 April", totalReported: 62, totalFixed: 28, pending: 34, reoccurring: 2, severityBreakdown: { low: 20, medium: 20, high: 12, critical: 10 }, topLocality: "Indiranagar", worstLocality: "Outer Ring Road", aiSummary: "Heavy rains in the second week led to a surge in new reports on Outer Ring Road. Indiranagar maintains the best resolution rate.", generatedAt: "2026-04-14T10:00:00Z" },
  ];
  const repBatch = db.batch();
  for (const r of pastReports) {
    repBatch.set(db.collection("weekly_reports").doc(r.id), r);
  }
  await repBatch.commit();
  console.log(`   ✅ ${pastReports.length} weekly reports seeded`);

  console.log("\n🎉 Database seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
