import { useParams, Link } from "react-router-dom";
import { localities, wards, Severity } from "@/lib/bengaluru-data";
import { fetchPotholes } from "@/lib/api";
import { Pothole } from "../../backend/src/models/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Filter, SlidersHorizontal, Activity } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";

type TimeToRes = "Fast" | "Moderate" | "Slow";
type WardStatus = "Good" | "Moderate" | "Critical";

export default function LocalityDetail() {
  const { id } = useParams();
  const { lang } = useI18n();

  const locality = localities.find((l) => l.id === id);

  // We get the ward(s) for this locality. In our mock data, it's 1 ward.
  const wardIds = locality ? [locality.wardId] : [];
  const localityWards = wards.filter((w) => wardIds.includes(w.id));

  // --- Filter State ---
  const [minPotholes, setMinPotholes] = useState<number>(0);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>(["low", "medium", "high", "critical"]);
  const [minResolution, setMinResolution] = useState<number>(0);
  const [selectedTime, setSelectedTime] = useState<TimeToRes[]>(["Fast", "Moderate", "Slow"]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"status" | "potholes" | "resolution">("status");

  const [dbPotholes, setDbPotholes] = useState<Pothole[]>([]);
  useEffect(() => {
    fetchPotholes().then(res => setDbPotholes(res.potholes)).catch(console.error);
  }, []);

  // --- Compute Ward Stats ---
  const wardStats = useMemo(() => {
    return localityWards.map((w) => {
      // Find potholes in this ward
      // NOTE: Our mock data links potholes to both localityId and wardId.
      const wPotholes = dbPotholes.filter((p) => p.wardId === w.id && p.localityId === locality?.id);

      const totalPotholes = wPotholes.length;

      const severities = {
        low: wPotholes.filter((p) => p.severity === "low").length,
        medium: wPotholes.filter((p) => p.severity === "medium").length,
        high: wPotholes.filter((p) => p.severity === "high" || p.severity === "critical").length,
      };

      const fixed = wPotholes.filter((p) => p.status === "repaired");
      const resRate = totalPotholes === 0 ? 0 : Math.round((fixed.length / totalPotholes) * 100);

      const avgResDays = fixed.length === 0 ? 0 : fixed.reduce((acc, p) => acc + p.daysOpen, 0) / fixed.length;

      let timeToRes: TimeToRes = "Moderate";
      if (avgResDays <= 3) timeToRes = "Fast";
      else if (avgResDays > 7) timeToRes = "Slow";

      // Status Logic
      // Critical -> high potholes (> 10) + low resolution (< 40%)
      // Good -> low potholes (< 5) + high resolution (> 70%)
      // Moderate -> else
      let status: WardStatus = "Moderate";
      if (totalPotholes > 8 && resRate < 50) status = "Critical";
      else if (totalPotholes < 5 && resRate > 60) status = "Good";

      return { w, totalPotholes, severities, resRate, avgResDays, timeToRes, status, wPotholes };
    });
  }, [localityWards, locality, dbPotholes]);

  // --- Apply Filters & Sort ---
  const filteredWards = useMemo(() => {
    let result = wardStats.filter((stat) => {
      if (stat.totalPotholes < minPotholes) return false;
      if (stat.resRate < minResolution) return false;
      if (!selectedTime.includes(stat.timeToRes)) return false;

      const hasMatchingSeverity = stat.wPotholes.some(p => selectedSeverities.includes(p.severity));
      if (stat.totalPotholes > 0 && !hasMatchingSeverity && selectedSeverities.length < 4) return false;

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === "potholes") return b.totalPotholes - a.totalPotholes;
      if (sortBy === "resolution") return b.resRate - a.resRate;
      if (sortBy === "status") {
        const priority = { Critical: 3, Moderate: 2, Good: 1 };
        if (priority[a.status] !== priority[b.status]) {
          return priority[b.status] - priority[a.status];
        }
        return b.totalPotholes - a.totalPotholes;
      }
      return 0;
    });

    return result;
  }, [wardStats, minPotholes, minResolution, selectedTime, selectedSeverities, sortBy]);

  if (!locality) return <div className="p-8">Locality not found.</div>;

  const toggleSeverity = (sev: string) => {
    setSelectedSeverities(prev => prev.includes(sev) ? prev.filter(s => s !== sev) : [...prev, sev]);
  };

  const toggleTime = (time: TimeToRes) => {
    setSelectedTime(prev => prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]);
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-5 animate-fade-in pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link to="/localities"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-xl lg:text-2xl font-display font-bold">
            {lang === "kn" ? locality.nameKn : locality.name}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Ward Level Overview</p>
        </div>
      </div>

      {/* Filter Toggle Mobile */}
      <Button
        variant="outline"
        className="w-full flex lg:hidden items-center justify-center gap-2 rounded-xl"
        onClick={() => setShowFilters(!showFilters)}
      >
        <Filter className="h-4 w-4" /> {showFilters ? "Hide Filters" : "Show Filters"}
      </Button>

      {/* Filter Panel */}
      <Card className={`p-5 ${showFilters ? 'block' : 'hidden lg:block'} border border-primary/20 shadow-sm rounded-2xl`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" /> Filters & Sort
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border border-border rounded px-2 py-1 outline-none text-foreground"
            >
              <option value="status">Status (Critical first)</option>
              <option value="potholes">Total Potholes</option>
              <option value="resolution">Resolution Rate</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Potholes Range */}
          <div className="space-y-3">
            <label className="text-xs font-semibold">Min Potholes: {minPotholes}</label>
            <input
              type="range"
              min="0" max="20"
              value={minPotholes}
              onChange={(e) => setMinPotholes(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Resolution Range */}
          <div className="space-y-3">
            <label className="text-xs font-semibold">Min Resolution Rate: {minResolution}%</label>
            <input
              type="range"
              min="0" max="100" step="10"
              value={minResolution}
              onChange={(e) => setMinResolution(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Severity Multi-select */}
          <div className="space-y-2">
            <label className="text-xs font-semibold">Severity Included</label>
            <div className="flex flex-wrap gap-2">
              {["low", "medium", "high", "critical"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => toggleSeverity(sev)}
                  className={`px-2 py-1 text-[10px] uppercase font-semibold rounded-md border transition-all ${selectedSeverities.includes(sev)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 text-muted-foreground border-border hover:bg-muted"
                    }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Time to Resolution */}
          <div className="space-y-2">
            <label className="text-xs font-semibold">Avg Resolution Time</label>
            <div className="flex flex-wrap gap-2">
              {(["Fast", "Moderate", "Slow"] as TimeToRes[]).map((time) => (
                <button
                  key={time}
                  onClick={() => toggleTime(time)}
                  className={`px-2 py-1 text-[10px] uppercase font-semibold rounded-md border transition-all ${selectedTime.includes(time)
                      ? "bg-secondary text-secondary-foreground border-secondary"
                      : "bg-muted/30 text-muted-foreground border-border hover:bg-muted"
                    }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

        </div>
      </Card>

      {/* Wards List */}
      <div className="space-y-4 mt-6">
        {filteredWards.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
            No wards match the selected filters.
          </div>
        ) : (
          filteredWards.map((stat) => {
            const statusColors = {
              Critical: "bg-red-500/10 text-red-600 border-red-500/20",
              Moderate: "bg-amber-500/10 text-amber-600 border-amber-500/20",
              Good: "bg-green-500/10 text-green-600 border-green-500/20"
            };

            return (
              <Link to={`/wards/${stat.w.id}`} key={stat.w.id}>
                <Card className="overflow-hidden flex flex-col md:flex-row shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group">

                  {/* Left block - Identity & Status */}
                  <div className="p-5 md:w-1/3 bg-muted/20 border-b md:border-b-0 md:border-r border-border flex flex-col justify-between gap-4 group-hover:bg-muted/40 transition-colors">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Ward {stat.w.number}</div>
                      <div className="font-display font-bold text-lg group-hover:text-primary transition-colors">{stat.w.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{stat.w.zone} Zone</div>
                    </div>

                    <div className={`px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5 w-max font-semibold text-xs ${statusColors[stat.status]}`}>
                      <Activity className="h-3.5 w-3.5" />
                      Status: {stat.status}
                    </div>
                  </div>

                  {/* Right block - Stats */}
                  <div className="p-5 md:w-2/3 grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total */}
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Potholes</div>
                      <div className="text-2xl font-bold">{stat.totalPotholes}</div>
                    </div>

                    {/* Resolution Rate */}
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Resolution Rate</div>
                      <div className="text-2xl font-bold">{stat.resRate}%</div>
                    </div>

                    {/* Avg Res Time */}
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg Resolve Time</div>
                      <div className="text-xl font-bold mt-1">
                        {stat.avgResDays === 0 ? "—" : `${Math.round(stat.avgResDays * 10) / 10} days`}
                      </div>
                      <div className="text-[10px] font-semibold text-muted-foreground">{stat.timeToRes}</div>
                    </div>

                    {/* Severity Dist */}
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Severity (L/M/H)</div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-700 text-xs font-bold">{stat.severities.low}</div>
                        <div className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 text-xs font-bold">{stat.severities.medium}</div>
                        <div className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-700 text-xs font-bold">{stat.severities.high}</div>
                      </div>
                    </div>

                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
