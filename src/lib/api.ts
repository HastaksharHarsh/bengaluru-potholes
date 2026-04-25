import type { Pothole, PotholeStatus, Severity, SizeBucket, Ward, Locality, DashboardStats, WardStats, WeeklyReport, AIImageAnalysis, AISeverityResult } from "../../backend/src/models/types";

const API_BASE = "http://localhost:3001/api";

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("supervisorToken");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Remove Content-Type if sending FormData (browser handles it)
  if (options?.body instanceof FormData) {
    delete (headers as Record<string, string>)["Content-Type"];
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ─── Potholes ──────────────────────────────────────────────────────────────

export async function fetchPotholes(params?: {
  limit?: number;
  offset?: number;
  severity?: Severity;
  status?: PotholeStatus;
  localityId?: string;
  wardId?: string;
}): Promise<{ potholes: Pothole[]; total: number }> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.append(key, String(value));
    });
  }
  return fetchAPI<{ potholes: Pothole[]; total: number }>(`/potholes?${query.toString()}`);
}

export async function fetchMapPotholes(): Promise<Pothole[]> {
  return fetchAPI<Pothole[]>("/potholes/map");
}

export async function fetchNearbyPotholes(lat: number, lng: number, radius?: number): Promise<Pothole[]> {
  const query = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (radius) query.append("radius", String(radius));
  return fetchAPI<Pothole[]>(`/potholes/nearby?${query.toString()}`);
}

export async function reportPothole(data: {
  lat: number;
  lng: number;
  size: SizeBucket;
  image?: File;
  voiceNote?: string;
  severity?: string;
  severityScore?: number;
}): Promise<{ pothole?: Pothole; severity?: AISeverityResult; duplicate: boolean; isReoccurrence?: boolean; potholeId?: string; upvotes?: number }> {
  const formData = new FormData();
  formData.append("lat", String(data.lat));
  formData.append("lng", String(data.lng));
  formData.append("size", data.size);
  if (data.voiceNote) formData.append("voiceNote", data.voiceNote);
  if (data.severity) formData.append("severity", data.severity);
  if (data.severityScore !== undefined) formData.append("severityScore", String(data.severityScore));
  if (data.image) formData.append("image", data.image);

  return fetchAPI("/potholes", {
    method: "POST",
    body: formData,
  });
}

export async function updatePotholeStatus(id: string, status: PotholeStatus): Promise<Pothole> {
  return fetchAPI<Pothole>(`/potholes/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ─── Dashboard Stats ────────────────────────────────────────────────────────

export async function fetchDashboardStats(lat?: number, lng?: number): Promise<DashboardStats> {
  const query = new URLSearchParams();
  if (lat && lng) {
    query.append("lat", String(lat));
    query.append("lng", String(lng));
  }
  return fetchAPI<DashboardStats>(`/stats/dashboard?${query.toString()}`);
}

// ─── Wards ──────────────────────────────────────────────────────────────────

export async function fetchWardRankings(): Promise<Array<Ward & WardStats>> {
  return fetchAPI<Array<Ward & WardStats>>("/wards");
}

export async function fetchWardDetail(id: string): Promise<Ward & WardStats & { potholes: Pothole[] }> {
  return fetchAPI<Ward & WardStats & { potholes: Pothole[] }>(`/wards/${id}`);
}

// ─── Localities ─────────────────────────────────────────────────────────────

export async function fetchLocalities(): Promise<Array<Locality & { healthScore: number; potholeCount: number; resolutionRate: number }>> {
  return fetchAPI<Array<Locality & { healthScore: number; potholeCount: number; resolutionRate: number }>>("/localities");
}

export async function fetchLocalityDetail(id: string): Promise<Locality & { healthScore: number; ward: Ward; potholes: Pothole[]; totalPotholes: number }> {
  return fetchAPI<Locality & { healthScore: number; ward: Ward; potholes: Pothole[]; totalPotholes: number }>(`/localities/${id}`);
}

// ─── Reports ────────────────────────────────────────────────────────────────

export async function fetchWeeklyReports(): Promise<WeeklyReport[]> {
  return fetchAPI<WeeklyReport[]>("/reports/weekly");
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function supervisorLogin(username: string, password: string): Promise<{ token: string }> {
  const res = await fetchAPI<{ token: string }>("/auth/supervisor/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem("supervisorToken", res.token);
  return res;
}
