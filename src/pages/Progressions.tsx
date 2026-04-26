import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { PotholeMap } from "@/components/maps/PotholeMap";
import { SeverityBadge } from "@/components/SeverityBadge";
import { PotholeStatusBadge } from "@/components/PotholeStatusBadge";
import { fetchProgressions, updatePotholeStatus } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { getLocality, getWard } from "@/lib/bengaluru-data";
import { 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  Map as MapIcon, 
  Filter, 
  Download, 
  Bell, 
  MoreHorizontal,
  ArrowUpRight,
  ShieldAlert,
  Loader2,
  ExternalLink,
  CheckCircle2,
  UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Progressions() {
  const { isSupervisor, bumpVersion, version } = useAppStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  useEffect(() => {
    const load = () => {
      // Don't set loading state on poll, only on first load or filter change
      fetchProgressions({
        severity: filterSeverity === "all" ? undefined : filterSeverity as any
      })
        .then(res => {
          console.log("📥 Progressions Data:", res);
          setData(res);
        })
        .catch(err => {
          console.error("❌ Progressions Fetch Error:", err);
        })
        .finally(() => setLoading(false));
    };

    setLoading(true);
    load();

    const interval = setInterval(load, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [version, filterSeverity]);

  const handleAction = async (id: string, status: "repaired") => {
    await updatePotholeStatus(id, status);
    bumpVersion();
  };

  if (!isSupervisor) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] p-8 text-center">
        <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">Access Restricted</h1>
        <p className="text-muted-foreground mt-2 max-w-md">
          The Pothole Progressions module is only available to authorized municipal staff and supervisors.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" /> Pothole Progressions
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor unresolved potholes that are worsening over time based on traffic and age.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button size="sm" className="gradient-hero text-white">
            <Bell className="h-4 w-4 mr-2" /> Send Alerts
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard 
          label="Progressing" 
          value={data?.stats.total ?? 0} 
          hint="Unresolved cases" 
          icon={TrendingUp} 
        />
        <StatCard 
          label="Critical Cases" 
          value={data?.stats.critical ?? 0} 
          hint="Priority escalation" 
          icon={AlertCircle} 
          tone="critical" 
        />
        <StatCard 
          label="Avg Days Open" 
          value={data?.stats.avgDaysOpen ?? 0} 
          hint="Since first report" 
          icon={Clock} 
          tone="warn" 
        />
        <StatCard 
          label="High Risk Zones" 
          value={data?.stats.highRiskZones ?? 0} 
          hint="Concentrated areas" 
          icon={MapIcon} 
        />
        <StatCard 
          label="Escalated (Wk)" 
          value={data?.stats.escalatedThisWeek ?? 0} 
          hint="Worsened recently" 
          icon={ArrowUpRight} 
          tone="info"
        />
      </section>

      {/* Filters & Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main List */}
        <div className="xl:col-span-2 space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select 
                  className="bg-transparent text-sm font-medium focus:outline-none"
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical Only</option>
                  <option value="high">High Risk</option>
                  <option value="medium">Medium Risk</option>
                </select>
              </div>
              <div className="text-xs text-muted-foreground">
                Showing {data?.potholes.length ?? 0} active progressions
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Analysing deterioration patterns...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-left">
                      <th className="pb-3 font-medium">Pothole & Location</th>
                      <th className="pb-3 font-medium text-center">Age (Days)</th>
                      <th className="pb-3 font-medium text-center">Progression</th>
                      <th className="pb-3 font-medium text-center">Risk Level</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data?.potholes.map((p: any) => {
                      const loc = getLocality(p.localityId);
                      return (
                        <tr key={p.id} className="group hover:bg-muted/30 transition-colors">
                          <td className="py-4">
                            <div className="font-semibold">{p.road}</div>
                            <div className="text-xs text-muted-foreground">{loc.name} • Ward {getWard(p.wardId).number}</div>
                          </td>
                          <td className="py-4 text-center font-mono">
                            <Badge variant="outline" className={cn(
                              p.daysOpen >= 45 ? "border-red-500 text-red-600 bg-red-50" :
                              p.daysOpen >= 30 ? "border-orange-500 text-orange-600 bg-orange-50" :
                              "border-border"
                            )}>
                              {p.daysOpen}d
                            </Badge>
                          </td>
                          <td className="py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                                {p.size} <ArrowUpRight className="h-3 w-3" /> {p.projectedSize}
                              </div>
                              <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                                <div className={cn(
                                  "h-full transition-all",
                                  p.riskLevel === 'critical' ? "bg-red-500" :
                                  p.riskLevel === 'high' ? "bg-orange-500" :
                                  "bg-yellow-500"
                                )} style={{ width: p.daysOpen >= 45 ? '100%' : `${(p.daysOpen / 45) * 100}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-center">
                            <Badge className={cn(
                              "capitalize shadow-sm",
                              p.riskLevel === 'critical' ? "bg-red-600 animate-pulse" :
                              p.riskLevel === 'high' ? "bg-orange-500" :
                              p.riskLevel === 'moderate' ? "bg-yellow-500" : "bg-green-500"
                            )}>
                              {p.riskLevel}
                            </Badge>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Mark Fixed" onClick={() => handleAction(p.id, "repaired")}>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Assign Team">
                                <UserPlus className="h-4 w-4 text-primary" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {data?.potholes.length === 0 && (
                  <div className="text-center py-20">
                    <p className="text-muted-foreground">No active progressions found for these filters.</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar Panel */}
        <div className="space-y-6">
          <Card className="p-4 space-y-4">
            <h3 className="font-display font-bold flex items-center gap-2">
              <MapIcon className="h-4 w-4" /> Spatial Hotspots
            </h3>
            <div className="rounded-xl overflow-hidden border">
              <PotholeMap 
                potholes={data?.potholes ?? []} 
                height="300px" 
                showHeatmap={false} 
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Progressive potholes are concentrated in high-traffic corridors. Red markers indicate areas where deterioration is critical (30+ days).
            </p>
          </Card>

          <Card className="p-4 space-y-3 bg-primary/5 border-primary/20">
            <h3 className="font-display font-bold text-primary flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Notification Center
            </h3>
            <div className="space-y-2">
              {[
                { label: "New Critical Pothole", sub: "Old Airport Rd • 3 mins ago", type: "critical" },
                { label: "SLA Deadline Approaching", sub: "Richmond Circle • 2 cases", type: "warn" },
                { label: "Report Surge in Koramangala", sub: "12 new entries near School zone", type: "info" }
              ].map((n, i) => (
                <div key={i} className="bg-background/50 p-2.5 rounded-lg border border-border/50">
                  <div className="font-semibold text-xs">{n.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{n.sub}</div>
                </div>
              ))}
            </div>
            <Button variant="link" className="text-xs p-0 h-auto text-primary">View all alerts →</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
