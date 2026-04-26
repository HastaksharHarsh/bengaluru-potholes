import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPotholes } from "@/lib/api";
import { wards } from "@/lib/bengaluru-data";
import type { Pothole } from "../../../backend/src/models/types";
import { Newspaper, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

// ── per-ward stats ───────────────────────────────────────────────────────
function computeWardRows(potholes: Pothole[]) {
  return wards.map(w => {
    const ps = potholes.filter(p => p.wardId === w.id);
    const total = ps.length;
    const repaired = ps.filter(p => p.status === "repaired").length;
    const resolutionRate = total > 0 ? Math.round((repaired / total) * 100) : 0;

    // Average severity label
    let avgSeverityLabel = "Low";
    let avgSeverityColor = "text-green-500";
    if (total > 0) {
      const avgScore = ps.reduce((acc, p) => acc + p.severityScore, 0) / total;
      if (avgScore >= 70) { avgSeverityLabel = "High"; avgSeverityColor = "text-red-500"; }
      else if (avgScore >= 40) { avgSeverityLabel = "Medium"; avgSeverityColor = "text-amber-500"; }
    }

    return { w, total, repaired, resolutionRate, avgSeverityLabel, avgSeverityColor };
  });
}

// Fallback data when backend is offline
const FALLBACK_REPORTS: Record<string, { total: number; resolutionRate: number; avgSeverityLabel: string; avgSeverityColor: string }> = {
  "w-150": { total: 18, resolutionRate: 16, avgSeverityLabel: "High",   avgSeverityColor: "text-red-500"   },
  "w-117": { total: 18, resolutionRate: 14, avgSeverityLabel: "High",   avgSeverityColor: "text-red-500"   },
  "w-080": { total: 14, resolutionRate: 28, avgSeverityLabel: "Medium", avgSeverityColor: "text-amber-500" },
  "w-072": { total: 14, resolutionRate: 22, avgSeverityLabel: "Medium", avgSeverityColor: "text-amber-500" },
  "w-176": { total: 17, resolutionRate: 12, avgSeverityLabel: "High",   avgSeverityColor: "text-red-500"   },
  "w-189": { total: 15, resolutionRate: 18, avgSeverityLabel: "High",   avgSeverityColor: "text-red-500"   },
  "w-097": { total: 16, resolutionRate: 19, avgSeverityLabel: "High",   avgSeverityColor: "text-red-500"   },
  "w-112": { total: 16, resolutionRate: 17, avgSeverityLabel: "High",   avgSeverityColor: "text-red-500"   },
  "w-006": { total: 12, resolutionRate: 33, avgSeverityLabel: "Low",    avgSeverityColor: "text-green-500" },
  "w-198": { total: 17, resolutionRate: 15, avgSeverityLabel: "High",   avgSeverityColor: "text-red-500"   },
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
      const fb = FALLBACK_REPORTS[w.id] ?? { total: 0, resolutionRate: 0, avgSeverityLabel: "Low", avgSeverityColor: "text-green-500" };
      return { w, repaired: 0, ...fb };
    });
  }, [rows, usingFallback]);

  return (
    <div className="p-4 lg:p-8 space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl lg:text-2xl font-display font-bold flex items-center gap-2">
          <Newspaper className="h-6 w-6 text-primary" />
          Civic Newsletters
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Select a ward to read its auto-generated civic newsletter — built from live pothole data.
          {usingFallback && <span className="text-amber-500 ml-2">⚠ Backend offline — showing estimated data</span>}
        </p>
      </div>

      {/* Ward cards — simple style matching old Localities UI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {effectiveRows.map((r) => (
          <Card
            key={r.w.id}
            className="p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-smooth flex flex-col justify-between"
            onClick={() => navigate(`/newsletter/${r.w.id}`)}
          >
            {/* Title row */}
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display font-semibold text-lg">{r.w.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">1 Ward · {r.w.constituency}</div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground opacity-50" />
            </div>

            {/* Stats row: Reports / Severity / Resolution */}
            <div className="mt-4 grid grid-cols-3 gap-3 divide-x">
              <div className="flex flex-col items-center justify-center">
                <div className="text-xl font-bold">{loading ? "—" : r.total}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Reports</div>
              </div>
              <div className="flex flex-col items-center justify-center">
                <div className={`text-sm font-bold ${r.avgSeverityColor}`}>{r.avgSeverityLabel}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Severity</div>
              </div>
              <div className="flex flex-col items-center justify-center">
                <div className="text-xl font-bold">{loading ? "—" : `${r.resolutionRate}%`}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Resolution</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
