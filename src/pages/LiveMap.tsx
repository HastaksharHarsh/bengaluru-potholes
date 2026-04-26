import { useEffect, useState, useMemo } from "react";
import { PotholeMap } from "@/components/maps/PotholeMap";
import { fetchPotholes } from "@/lib/api";
import type { Pothole } from "../../backend/src/models/types";
import { localities, wards } from "@/lib/bengaluru-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Layers, MapPin, Filter, X, ChevronDown, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Severity = "all" | "critical" | "high" | "medium" | "low";
type StatusFilter = "all" | "reported" | "in_progress" | "verified" | "repaired";

export default function LiveMap() {
  const { t } = useI18n();
  const [heatmap, setHeatmap] = useState(true);
  const [severity, setSeverity] = useState<Severity>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [localityFilter, setLocalityFilter] = useState<string>("all");
  const [wardFilter, setWardFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const [dbPotholes, setDbPotholes] = useState<Pothole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPotholes().then(res => setDbPotholes(res.potholes)).finally(() => setLoading(false));
  }, []);

  const filteredWards = useMemo(() => {
    if (localityFilter === "all") return wards;
    const loc = localities.find(l => l.id === localityFilter);
    return loc ? wards.filter(w => w.id === loc.wardId) : wards;
  }, [localityFilter]);

  const data = useMemo(() => {
    return dbPotholes.filter(p => {
      if (severity !== "all" && p.severity !== severity) return false;
      if (status !== "all" && p.status !== status) return false;
      if (localityFilter !== "all" && p.localityId !== localityFilter) return false;
      if (wardFilter !== "all" && p.wardId !== wardFilter) return false;
      return true;
    });
  }, [severity, status, localityFilter, wardFilter, dbPotholes]);

  const hasActiveFilters = severity !== "all" || status !== "all" || localityFilter !== "all" || wardFilter !== "all";

  const resetFilters = () => {
    setSeverity("all");
    setStatus("all");
    setLocalityFilter("all");
    setWardFilter("all");
  };

  const severityTones: Record<string, string> = {
    critical: "bg-red-600",
    high: "bg-orange-500",
    medium: "bg-amber-500",
    low: "bg-blue-500",
    all: "bg-gray-400",
  };

  return (
    <div className="p-4 lg:p-8 space-y-5 animate-fade-in bg-[#f8f9fa] min-h-screen">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Live Map</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time geospatial intelligence of road hazards in Bengaluru.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode */}
          <div className="flex bg-white rounded-xl p-1 border border-gray-200 shadow-card">
            <button
              onClick={() => setHeatmap(true)}
              className={cn(
                "h-8 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
                heatmap ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <Layers className="h-3.5 w-3.5" /> Heatmap
            </button>
            <button
              onClick={() => setHeatmap(false)}
              className={cn(
                "h-8 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
                !heatmap ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <MapPin className="h-3.5 w-3.5" /> Markers
            </button>
          </div>

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "h-10 rounded-xl px-4 border-gray-200 bg-white font-semibold text-xs gap-2 transition-all shadow-card",
              showFilters && "border-blue-600 text-blue-600 bg-blue-50/50"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-blue-600 ml-1 animate-pulse" />}
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" onClick={resetFilters} className="h-10 rounded-xl px-3 text-xs text-gray-400 hover:text-red-500 gap-1.5">
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="p-6 bg-white border-border shadow-raised space-y-6 rounded-2xl animate-fade-in overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Severity */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Severity Level</div>
              <div className="flex flex-wrap gap-2">
                {(["all", "critical", "high", "medium", "low"] as Severity[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSeverity(s)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                      severity === s 
                        ? "border-blue-600 bg-blue-600 text-white shadow-md"
                        : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Resolution Status</div>
              <div className="flex flex-wrap gap-2">
                {(["all", "reported", "repaired"] as StatusFilter[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                      status === s 
                        ? "border-blue-600 bg-blue-600 text-white shadow-md"
                        : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                    )}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Locality */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Locality Area</div>
              <select 
                value={localityFilter} 
                onChange={(e) => { setLocalityFilter(e.target.value); setWardFilter("all"); }}
                className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-blue-600 outline-none"
              >
                <option value="all">All Localities</option>
                {localities.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            {/* Ward */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Ward Sub-filter</div>
              <select 
                value={wardFilter} 
                onChange={(e) => setWardFilter(e.target.value)}
                disabled={localityFilter === "all"}
                className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-blue-600 outline-none disabled:opacity-50"
              >
                <option value="all">All Wards</option>
                {filteredWards.map(w => <option key={w.id} value={w.id}>Ward {w.number} — {w.name}</option>)}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Map Content */}
      <div className="relative rounded-3xl overflow-hidden border border-gray-200 shadow-raised">
        {loading ? (
          <div className="h-[70vh] bg-gray-50 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Initializing spatial data…</p>
          </div>
        ) : (
          <PotholeMap potholes={data} showHeatmap={heatmap} height="70vh" />
        )}

        {/* Legend Overlay */}
        <div className="absolute bottom-6 left-6 p-4 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200 shadow-overlay flex items-center gap-6 pointer-events-none">
          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Severity Legend</div>
            <div className="flex items-center gap-4">
              {(["critical", "high", "medium", "low"] as const).map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={cn("h-3 w-3 rounded-full", severityTones[s])} />
                  <span className="text-[10px] font-bold text-gray-600 capitalize">{s}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-[10px] font-bold text-gray-600">Repaired</span>
              </div>
            </div>
          </div>
          <div className="h-8 w-px bg-gray-200 mx-2" />
          <div className="flex flex-col gap-0.5">
             <div className="text-lg font-bold text-gray-900 tabular-nums leading-none">{data.length}</div>
             <div className="text-[10px] font-bold text-gray-400 uppercase">Hazards</div>
          </div>
        </div>
      </div>
    </div>
  );
}
