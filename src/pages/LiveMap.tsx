import { useEffect, useState, useMemo } from "react";
import { PotholeMap } from "@/components/maps/PotholeMap";
import { fetchPotholes } from "@/lib/api";
import type { Pothole } from "../../backend/src/models/types";
import { localities, wards } from "@/lib/bengaluru-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Layers, MapPin, Filter, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

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

  // Derive available wards from selected locality
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

  const severityColors: Record<string, string> = {
    critical: "bg-red-500/10 text-red-600 border-red-200",
    high: "bg-orange-500/10 text-orange-600 border-orange-200",
    medium: "bg-amber-500/10 text-amber-600 border-amber-200",
    low: "bg-blue-500/10 text-blue-600 border-blue-200",
    all: "bg-muted text-muted-foreground",
  };

  const statusColors: Record<string, string> = {
    reported: "bg-red-500/10 text-red-600",
    in_progress: "bg-amber-500/10 text-amber-600",
    verified: "bg-blue-500/10 text-blue-600",
    repaired: "bg-green-500/10 text-green-600",
    all: "bg-muted text-muted-foreground",
  };

  return (
    <div className="p-4 lg:p-8 space-y-4 animate-fade-in">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">{t("nav_map")}</h1>
          <p className="text-sm text-muted-foreground">
            Live pothole density across Bengaluru — {loading ? "loading..." : `${data.length} of ${dbPotholes.length} shown`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode */}
          <div className="flex gap-1 bg-muted/50 rounded-lg p-1 border border-border">
            <Button
              variant={heatmap ? "default" : "ghost"}
              size="sm"
              onClick={() => setHeatmap(true)}
              className="h-7 px-3 text-xs gap-1.5"
            >
              <Layers className="h-3 w-3" /> Heatmap
            </Button>
            <Button
              variant={!heatmap ? "default" : "ghost"}
              size="sm"
              onClick={() => setHeatmap(false)}
              className="h-7 px-3 text-xs gap-1.5"
            >
              <MapPin className="h-3 w-3" /> Markers
            </Button>
          </div>

          {/* Filter Toggle */}
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-7 gap-1.5 text-xs"
          >
            <Filter className="h-3 w-3" />
            Filters
            {hasActiveFilters && (
              <span className="ml-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                !
              </span>
            )}
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 gap-1 text-xs text-muted-foreground">
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="p-4 border-primary/20 bg-primary/5 space-y-4 animate-fade-in">
          {/* Severity Filter */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Severity</div>
            <div className="flex flex-wrap gap-2">
              {(["all", "critical", "high", "medium", "low"] as Severity[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSeverity(s)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border transition-all ${
                    severity === s
                      ? s === "all" ? "bg-primary text-primary-foreground border-primary" : severityColors[s] + " ring-2 ring-offset-1 ring-current"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Status</div>
            <div className="flex flex-wrap gap-2">
              {(["all", "reported", "in_progress", "verified", "repaired"] as StatusFilter[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border transition-all ${
                    status === s
                      ? s === "all" ? "bg-primary text-primary-foreground border-primary" : statusColors[s] + " ring-2 ring-offset-1 ring-current"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Locality Filter */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Locality</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setLocalityFilter("all"); setWardFilter("all"); }}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  localityFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                All Localities
              </button>
              {localities.map(l => (
                <button
                  key={l.id}
                  onClick={() => { setLocalityFilter(l.id); setWardFilter("all"); }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    localityFilter === l.id ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>

          {/* Ward Sub-filter */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Ward</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setWardFilter("all")}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  wardFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                All Wards
              </button>
              {filteredWards.map(w => (
                <button
                  key={w.id}
                  onClick={() => setWardFilter(w.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    wardFilter === w.id ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Ward {w.number} – {w.name}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Map */}
      {loading ? (
        <div className="h-[72vh] rounded-xl bg-muted/20 border border-border flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading live pothole data…</p>
        </div>
      ) : (
        <PotholeMap potholes={data} showHeatmap={heatmap} height="72vh" />
      )}

      {/* Legend */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="font-semibold text-sm">Legend:</div>
          {(["critical", "high", "medium", "low"] as const).map(s => (
            <div key={s} className="flex items-center gap-1.5 capitalize">
              <span
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{
                  backgroundColor:
                    s === "critical" ? "hsl(var(--severity-critical))" :
                    s === "high" ? "hsl(var(--severity-high))" :
                    s === "medium" ? "hsl(var(--severity-medium))" :
                    "hsl(var(--severity-low))",
                }}
              />
              {s}
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-green-500 flex-shrink-0" />
            Repaired
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{data.length} potholes shown</Badge>
            {hasActiveFilters && (
              <Badge className="text-xs bg-primary/10 text-primary">Filtered</Badge>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
