// Bengaluru-specific mock data: wards, localities, potholes, weather.
// Single source of truth used across the app.

export type Severity = "critical" | "high" | "medium" | "low";
export type PotholeStatus = "reported" | "verified" | "in_progress" | "repaired";
export type SizeBucket = "small" | "medium" | "large";

export interface Ward {
  id: string;
  number: number;
  name: string;
  zone: string; // BBMP zone
  engineer: string;
  contact: string;
  mla: string;
  constituency: string;
}

export interface Locality {
  id: string;
  name: string;
  nameKn: string; // Kannada
  wardId: string;
  center: { lat: number; lng: number };
  trafficDensity: number; // 0-100
  isArterial: boolean;
}

export interface Pothole {
  id: string;
  localityId: string;
  wardId: string;
  position: { lat: number; lng: number };
  severity: Severity;
  severityScore: number; // 0-100
  size: SizeBucket;
  status: PotholeStatus;
  reports: number;
  reportedAt: string; // ISO
  daysOpen: number;
  imageUrl?: string;
  road: string;
  upvotes: number;
  slaHours: number;
  slaBreached: boolean;
  repairedAt?: string;
  reoccurred?: boolean;
  improperRepair?: boolean;
  linkedPreviousId?: string | null;
}

export interface WeatherSnapshot {
  rainfallMm: number; // last 24h
  forecast: "heavy" | "moderate" | "light" | "clear";
  monsoonRiskZones: string[]; // locality ids
}

export interface WeeklyReport {
  id: string;
  week: string;
  totalReported: number;
  totalFixed: number;
  pending: number;
  reoccurring: number;
  severityBreakdown: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  topLocality: string;
  worstLocality: string;
  aiSummary: string;
  generatedAt: string;
}

// ─── BBMP Wards (subset, realistic numbers) ────────────────────────────
export const wards: Ward[] = [
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

// ─── Localities ────────────────────────────────────────────────────────
export const localities: Locality[] = [
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

// ─── Synthetic potholes ────────────────────────────────────────────────
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

function pickSeverity(traffic: number, isArterial: boolean, days: number): { severity: Severity; score: number } {
  let score = traffic * 0.4 + (isArterial ? 30 : 10) + days * 1.2;
  score = Math.min(100, Math.round(score));
  let severity: Severity = "low";
  if (score >= 80) severity = "critical";
  else if (score >= 60) severity = "high";
  else if (score >= 40) severity = "medium";
  return { severity, score };
}

function jitter(value: number, range = 0.012): number {
  return value + (Math.random() - 0.5) * range;
}

function generatePotholes(): Pothole[] {
  const out: Pothole[] = [];
  let i = 0;
  for (const loc of localities) {
    // More potholes in arterial / high-traffic zones
    const count = Math.round(4 + (loc.trafficDensity / 100) * 14);
    const roads = ROADS[loc.id] || ["Main Rd"];
    for (let n = 0; n < count; n++) {
      const days = Math.floor(Math.random() * 18);
      const { severity, score } = pickSeverity(loc.trafficDensity, loc.isArterial, days);
      const sizeRoll = Math.random();
      const size: SizeBucket = sizeRoll > 0.7 ? "large" : sizeRoll > 0.35 ? "medium" : "small";
      const slaHours = severity === "critical" ? 48 : severity === "high" ? 120 : 240;
      const slaBreached = days * 24 > slaHours && severity !== "low";
      const statusRoll = Math.random();
      const status: PotholeStatus =
        statusRoll > 0.85 ? "repaired" : statusRoll > 0.65 ? "in_progress" : statusRoll > 0.3 ? "verified" : "reported";

      out.push({
        id: `ph-${++i}`,
        localityId: loc.id,
        wardId: loc.wardId,
        position: { lat: jitter(loc.center.lat), lng: jitter(loc.center.lng) },
        severity,
        severityScore: score,
        size,
        status,
        reports: 1 + Math.floor(Math.random() * 24),
        reportedAt: new Date(Date.now() - days * 86400000).toISOString(),
        daysOpen: days,
        road: roads[n % roads.length],
        upvotes: Math.floor(Math.random() * 60),
        slaHours,
        slaBreached,
      });
    }
  }
  return out;
}

export const potholes: Pothole[] = generatePotholes();

// ─── Weather ───────────────────────────────────────────────────────────
export const weather: WeatherSnapshot = {
  rainfallMm: 42,
  forecast: "heavy",
  monsoonRiskZones: ["loc-orr", "loc-silkboard", "loc-koramangala", "loc-whitefield"],
};

// ─── Helpers ───────────────────────────────────────────────────────────
export function getLocality(id: string) {
  return localities.find((l) => l.id === id)!;
}
export function getWard(id: string) {
  return wards.find((w) => w.id === id)!;
}

export function localityHealthScore(localityId: string): number {
  const loc = getLocality(localityId);
  const items = potholes.filter((p) => p.localityId === localityId && p.status !== "repaired");
  if (items.length === 0) return 100;
  const avgSeverity = items.reduce((a, p) => a + p.severityScore, 0) / items.length;
  const overdue = items.filter((p) => p.slaBreached).length;
  const rainPenalty = weather.monsoonRiskZones.includes(localityId) ? 8 : 0;
  let score = 100 - items.length * 1.6 - avgSeverity * 0.35 - overdue * 3 - loc.trafficDensity * 0.1 - rainPenalty;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function healthBand(score: number): { label: string; tone: "good" | "warn" | "bad" } {
  if (score >= 70) return { label: "Healthy", tone: "good" };
  if (score >= 40) return { label: "Moderate", tone: "warn" };
  return { label: "Critical", tone: "bad" };
}

export function wardStats(wardId: string) {
  const items = potholes.filter((p) => p.wardId === wardId);
  const open = items.filter((p) => p.status !== "repaired");
  const fixed = items.filter((p) => p.status === "repaired");
  const breached = open.filter((p) => p.slaBreached).length;
  const avgResolveDays =
    fixed.length === 0 ? 0 : Math.round((fixed.reduce((a, p) => a + p.daysOpen, 0) / fixed.length) * 10) / 10;
  // Performance score: high fix-rate, low breaches → high score
  const fixRate = items.length === 0 ? 0 : fixed.length / items.length;
  const perf = Math.max(0, Math.min(100, Math.round(fixRate * 100 - breached * 2)));
  return { total: items.length, open: open.length, fixed: fixed.length, breached, avgResolveDays, perf };
}

export function severityColor(s: Severity) {
  return {
    critical: "hsl(var(--severity-critical))",
    high: "hsl(var(--severity-high))",
    medium: "hsl(var(--severity-medium))",
    low: "hsl(var(--severity-low))",
  }[s];
}

export function markPotholeRepaired(id: string) {
  const p = potholes.find(x => x.id === id);
  if (p && p.status !== "repaired") {
    p.status = "repaired";
    p.repairedAt = new Date().toISOString();
  }
}

export function addPothole(p: Pothole) {
  potholes.unshift(p);
}

export const BENGALURU_CENTER = { lat: 12.9716, lng: 77.5946 };

export function generateWeeklyReport(weekName: string = "Current Week"): WeeklyReport {
  const reportedCount = potholes.length;
  const fixedCount = potholes.filter(p => p.status === "repaired").length;
  const pendingCount = potholes.filter(p => p.status !== "repaired").length;
  const reoccurringCount = potholes.filter(p => p.reoccurred).length;

  const severityBreakdown = {
    low: potholes.filter(p => p.severity === "low").length,
    medium: potholes.filter(p => p.severity === "medium").length,
    high: potholes.filter(p => p.severity === "high").length,
    critical: potholes.filter(p => p.severity === "critical").length,
  };

  const locStats = localities.map(l => ({
    name: l.name,
    count: potholes.filter(p => p.localityId === l.id && p.status !== "repaired").length,
    fixed: potholes.filter(p => p.localityId === l.id && p.status === "repaired").length
  }));

  const worstLocality = locStats.sort((a, b) => b.count - a.count)[0].name;
  const topLocality = locStats.sort((a, b) => b.fixed - a.fixed)[0].name;

  const aiSummary = `This week shows ${reportedCount > 50 ? "increased" : "stable"} pothole activity across the city. ${worstLocality} remains a high-risk area with the highest count of unresolved hazards. However, significant progress is noted in ${topLocality} where repair rates have improved. Immediate attention is required for the ${severityBreakdown.critical} critical-severity potholes reported near arterial roads.`;

  return {
    id: `report-${Date.now()}`,
    week: weekName,
    totalReported: reportedCount,
    totalFixed: fixedCount,
    pending: pendingCount,
    reoccurring: reoccurringCount,
    severityBreakdown,
    topLocality,
    worstLocality,
    aiSummary,
    generatedAt: new Date().toISOString()
  };
}

export const mockPastReports: WeeklyReport[] = [
  {
    id: "rep-1",
    week: "Week 1 April",
    totalReported: 45,
    totalFixed: 12,
    pending: 33,
    reoccurring: 4,
    severityBreakdown: { low: 10, medium: 15, high: 15, critical: 5 },
    topLocality: "Jayanagar",
    worstLocality: "Whitefield",
    aiSummary: "Early April saw moderate reporting volume. Jayanagar teams demonstrated high efficiency in closing minor reports.",
    generatedAt: "2026-04-07T10:00:00Z"
  },
  {
    id: "rep-2",
    week: "Week 2 April",
    totalReported: 62,
    totalFixed: 28,
    pending: 34,
    reoccurring: 2,
    severityBreakdown: { low: 20, medium: 20, high: 12, critical: 10 },
    topLocality: "Indiranagar",
    worstLocality: "Outer Ring Road",
    aiSummary: "Heavy rains in the second week led to a surge in new reports on Outer Ring Road. Indiranagar maintains the best resolution rate.",
    generatedAt: "2026-04-14T10:00:00Z"
  }
];
