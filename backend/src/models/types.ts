// ─── Shared TypeScript interfaces mirroring the frontend data model ─────────

export type Severity = "critical" | "high" | "medium" | "low";
export type PotholeStatus = "reported" | "verified" | "in_progress" | "repaired";
export type SizeBucket = "small" | "medium" | "large";

export interface Ward {
  id: string;
  number: number;
  name: string;
  zone: string;
  engineer: string;
  contact: string;
  mla: string;
  constituency: string;
}

export interface Locality {
  id: string;
  name: string;
  nameKn: string;
  wardId: string;
  center: { lat: number; lng: number };
  trafficDensity: number;
  isArterial: boolean;
}

export interface Pothole {
  id: string;
  localityId: string;
  wardId: string;
  position: { lat: number; lng: number };
  geohash: string;
  severity: Severity;
  severityScore: number;
  size: SizeBucket;
  status: PotholeStatus;
  reports: number;
  reportedAt: string;
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
}

export interface WeatherSnapshot {
  rainfallMm: number;
  forecast: "heavy" | "moderate" | "light" | "clear";
  monsoonRiskZones: string[];
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

export interface DashboardStats {
  activeCount: number;
  dangerCount: number;
  fixedThisMonth: number;
  nearYouCount: number;
  breachedCount: number;
  reoccurredCount: number;
  totalFixed: number;
  improperRepairPercent: number;
  totalPotholes: number;
}

export interface WardStats {
  wardId: string;
  total: number;
  open: number;
  fixed: number;
  breached: number;
  avgResolveDays: number;
  perf: number;
}

export interface CreatePotholeInput {
  lat: number;
  lng: number;
  size: SizeBucket;
  voiceNote?: string;
  // image comes via multipart form
}

export interface AISeverityResult {
  severity: Severity;
  score: number;
  reasons: string[];
}

export interface AIImageAnalysis {
  isPothole: boolean;
  confidence: number;
  estimatedSize?: SizeBucket;
  description: string;
}
