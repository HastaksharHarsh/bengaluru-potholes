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
  voiceNote?: string;
  trafficScore?: number;
  speedLimitKph?: number;
  congestionRatio?: number;
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

// ─── Helpers ───────────────────────────────────────────────────────────
export function getLocality(id: string) {
  return localities.find((l) => l.id === id)!;
}
export function getWard(id: string) {
  return wards.find((w) => w.id === id)!;
}

export function severityColor(s: Severity) {
  return {
    critical: "hsl(var(--severity-critical))",
    high: "hsl(var(--severity-high))",
    medium: "hsl(var(--severity-medium))",
    low: "hsl(var(--severity-low))",
  }[s];
}

export function healthBand(score: number): { label: string; tone: "good" | "warn" | "bad" } {
  if (score >= 70) return { label: "Healthy", tone: "good" };
  if (score >= 40) return { label: "Moderate", tone: "warn" };
  return { label: "Critical", tone: "bad" };
}

export const BENGALURU_CENTER = { lat: 12.9716, lng: 77.5946 };

