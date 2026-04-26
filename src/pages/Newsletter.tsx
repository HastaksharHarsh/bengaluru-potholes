import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPotholes } from "@/lib/api";
import { wards } from "@/lib/bengaluru-data";
import type { Pothole } from "../../backend/src/models/types";
import { Newspaper, ChevronRight, MapPin } from "lucide-react";

// ── per-ward stats ───────────────────────────────────────────────────────
function computeWardRows(potholes: Pothole[]) {
  return wards.map(w => {
    const ps = potholes.filter(p => p.wardId === w.id);
    const total = ps.length;
    const repaired = ps.filter(p => p.status === "repaired").length;
    const resolutionRate = total > 0 ? Math.round((repaired / total) * 100) : 0;

    let avgSeverityLabel = "Low";
    let avgSeverityColor = "text-green-600";
    let topAccent = "#22c55e";
    if (total > 0) {
      const avgScore = ps.reduce((acc, p) => acc + p.severityScore, 0) / total;
      if (avgScore >= 70) {
        avgSeverityLabel = "High";
        avgSeverityColor = "text-red-600";
        topAccent = "#ef4444";
      } else if (avgScore >= 40) {
        avgSeverityLabel = "Medium";
        avgSeverityColor = "text-amber-600";
        topAccent = "#f59e0b";
      }
    }

    return { w, total, repaired, resolutionRate, avgSeverityLabel, avgSeverityColor, topAccent };
  });
}

const FALLBACK_REPORTS: Record<string, { total: number; resolutionRate: number; avgSeverityLabel: string; avgSeverityColor: string; topAccent: string }> = {
  "w-150": { total: 18, resolutionRate: 16, avgSeverityLabel: "High",   avgSeverityColor: "text-red-600",   topAccent: "#ef4444" },
  "w-117": { total: 18, resolutionRate: 14, avgSeverityLabel: "High",   avgSeverityColor: "text-red-600",   topAccent: "#ef4444" },
  "w-080": { total: 14, resolutionRate: 28, avgSeverityLabel: "Medium", avgSeverityColor: "text-amber-600", topAccent: "#f59e0b" },
  "w-072": { total: 14, resolutionRate: 22, avgSeverityLabel: "Medium", avgSeverityColor: "text-amber-600", topAccent: "#f59e0b" },
  "w-176": { total: 17, resolutionRate: 12, avgSeverityLabel: "High",   avgSeverityColor: "text-red-600",   topAccent: "#ef4444" },
  "w-189": { total: 15, resolutionRate: 18, avgSeverityLabel: "High",   avgSeverityColor: "text-red-600",   topAccent: "#ef4444" },
  "w-097": { total: 16, resolutionRate: 19, avgSeverityLabel: "High",   avgSeverityColor: "text-red-600",   topAccent: "#ef4444" },
  "w-112": { total: 16, resolutionRate: 17, avgSeverityLabel: "High",   avgSeverityColor: "text-red-600",   topAccent: "#ef4444" },
  "w-006": { total: 12, resolutionRate: 33, avgSeverityLabel: "Low",    avgSeverityColor: "text-green-600", topAccent: "#22c55e" },
  "w-198": { total: 17, resolutionRate: 15, avgSeverityLabel: "High",   avgSeverityColor: "text-red-600",   topAccent: "#ef4444" },
};

export default function Newsletter() {
  const navigate = useNavigate();
  const [allPotholes, setAllPotholes] = useState<Pothole[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    fetchPotholes({ limit: 500 })
      .then(res => { setAllPotholes(res.potholes); setUsingFallback(false); })
      .catch(() => { setAllPotholes([]); setUsingFallback(true); })
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => computeWardRows(allPotholes), [allPotholes]);

  const effectiveRows = useMemo(() => {
    if (!usingFallback) return rows;
    return wards.map(w => {
      const fb = FALLBACK_REPORTS[w.id] ?? { total: 0, resolutionRate: 0, avgSeverityLabel: "Low", avgSeverityColor: "text-green-600", topAccent: "#22c55e" };
      return { w, repaired: 0, ...fb };
    });
  }, [rows, usingFallback]);

  return (
    <div className="p-[24px] lg:p-[28px] space-y-[20px] animate-fade-in pb-[120px] lg:pb-[28px]">

      {/* Header Banner */}
      <div className="hero-banner flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <div className="hero-banner-tag">BBMP · CIVIC TRANSPARENCY</div>
          <h1 className="hero-banner-title flex items-center gap-3">
            <Newspaper className="h-[24px] w-[24px] text-[#1a73e8]" /> Civic Newsletters
          </h1>
          <p className="hero-banner-subtitle">
            Select a ward to read its auto-generated civic newsletter — built from live pothole data.
          </p>
        </div>
        {usingFallback && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-[12px] font-[600] text-amber-700 bg-amber-50 border border-amber-200">
            ⚠ Offline Mode
          </div>
        )}
      </div>

      {/* Ward Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
        {effectiveRows.map((r) => (
          <div
            key={r.w.id}
            className="bg-white rounded-[14px] border border-[#cbd5e1] cursor-pointer overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
            style={{ borderTop: `3px solid ${r.topAccent}` }}
            onClick={() => navigate(`/newsletter/${r.w.id}`)}
          >
            <div className="p-[20px] space-y-5">
              {/* Title row */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[15px] font-[700] text-[#1a1f36] group-hover:text-[#1a73e8] transition-colors">
                    {r.w.name}
                  </div>
                  <div className="text-[12px] text-gray-500 font-[400] mt-0.5">
                    Ward {r.w.number} · {r.w.constituency}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#1a73e8] transition-colors mt-0.5" />
              </div>

              {/* Stats row */}
              <div className="flex items-center divide-x divide-gray-100">
                <div className="flex-1 flex flex-col items-center">
                  <div className="text-[22px] font-[700] text-gray-900">{loading ? "—" : r.total}</div>
                  <div className="text-[10px] font-[500] text-gray-500 uppercase tracking-[0.04em] mt-0.5">Reports</div>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div className={`text-[15px] font-[700] ${r.avgSeverityColor}`}>
                    {loading ? "—" : r.avgSeverityLabel}
                  </div>
                  <div className="text-[10px] font-[500] text-gray-500 uppercase tracking-[0.04em] mt-0.5">Risk</div>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div className="text-[22px] font-[700] text-[#1a73e8]">
                    {loading ? "—" : `${r.resolutionRate}%`}
                  </div>
                  <div className="text-[10px] font-[500] text-gray-500 uppercase tracking-[0.04em] mt-0.5">Fixed</div>
                </div>
              </div>
            </div>

            {/* Footer row */}
            <div className="px-[20px] py-[12px] flex items-center justify-between border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                <MapPin className="h-[13px] w-[13px]" /> {r.w.zone} Zone
              </div>
              <div className="flex items-center gap-1 text-[12px] font-[600] text-[#1a73e8] group-hover:underline">
                View audit <ChevronRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
