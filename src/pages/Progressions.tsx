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
  UserPlus,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Progressions() {
  const { isSupervisor, bumpVersion, version } = useAppStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  useEffect(() => {
    const load = () => {
      fetchProgressions({
        severity: filterSeverity === "all" ? undefined : filterSeverity as any
      })
        .then(res => {
          setData(res);
        })
        .catch(err => {
          console.error("❌ Progressions Fetch Error:", err);
        })
        .finally(() => setLoading(false));
    };

    setLoading(true);
    load();

    const interval = setInterval(load, 30000); 
    return () => clearInterval(interval);
  }, [version, filterSeverity]);

  const handleAction = async (id: string, status: "repaired") => {
    await updatePotholeStatus(id, status);
    bumpVersion();
  };

  return (
    <div className="p-[24px] lg:p-[28px] space-y-[20px] animate-fade-in pb-[120px] lg:pb-[28px]">
      {/* Header */}
      <div className="hero-banner flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <div className="hero-banner-tag">SUPERVISOR MODULE · BBMP</div>
          <h1 className="hero-banner-title">Pothole Progressions</h1>
          <p className="hero-banner-subtitle">Predictive monitoring of unresolved road hazards and deterioration patterns.</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Button variant="outline" size="sm" className="h-10 px-4 rounded-[10px] font-[600] text-gray-700 bg-white shadow-sm border-gray-200 hover:bg-gray-50 transition-all">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button size="sm" className="h-10 px-4 rounded-[10px] font-[600] text-white bg-[#1a73e8] hover:bg-[#1557b0] shadow-sm transition-all">
            <Bell className="h-4 w-4 mr-2" /> Send Alerts
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
        {[
          { label: "Progressing", value: data?.stats.total ?? 0, icon: TrendingUp, cardClass: "stat-card-blue", iconColor: "#1a73e8" },
          { label: "Critical", value: data?.stats.critical ?? 0, icon: AlertCircle, cardClass: "stat-card-red", iconColor: "#dc2626" },
          { label: "Avg Age", value: `${data?.stats.avgDaysOpen ?? 0}d`, icon: Clock, cardClass: "stat-card-yellow", iconColor: "#d97706" },
          { label: "Hotspots", value: data?.stats.highRiskZones ?? 0, icon: MapIcon, cardClass: "stat-card-purple", iconColor: "#7c3aed" },
        ].map((s) => (
          <div key={s.label} className={s.cardClass}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="h-[18px] w-[18px]" style={{ color: s.iconColor }} />
              <div className="text-[22px] font-[700]" style={{ color: s.iconColor }}>{s.value}</div>
            </div>
            <div className="text-[12px] font-[500] text-secondary-g uppercase tracking-[0.03em]">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <Card className="bg-white border-[rgba(0,0,0,0.06)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] rounded-[12px] overflow-hidden">
            <div className="p-[10px_16px] bg-[#f8f9fa] rounded-[10px] flex items-center justify-between mx-4 mt-4">
              <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-gray-400" />
                <select 
                  className="bg-transparent text-[14px] font-[500] text-primary-g focus:outline-none"
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                >
                  <option value="all">Filter: all hazards</option>
                  <option value="critical">Critical Only</option>
                  <option value="high">High Risk</option>
                </select>
                {data?.stats.escalatedThisWeek > 0 && (
                  <span className="g-chip bg-[#fce8e6] text-[#c5221f] text-[11px] font-[500] uppercase ml-2 px-2 py-0.5">
                    {data.stats.escalatedThisWeek} Worsening
                  </span>
                )}
              </div>
              <div className="text-[12px] font-[500] px-[12px] py-[4px] rounded-[20px] bg-[#e8f0fe] text-[#1a73e8] uppercase tracking-[0.02em]">
                {data?.potholes.length ?? 0} ACTIVE TRACKS
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Running deteriorating analysis…</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="py-3 px-6 text-[10px] font-bold uppercase text-gray-400 tracking-wider">Hazard & Location</th>
                      <th className="py-3 px-4 text-[10px] font-bold uppercase text-gray-400 tracking-wider text-center">Age</th>
                      <th className="py-3 px-4 text-[10px] font-bold uppercase text-gray-400 tracking-wider text-center">Progression</th>
                      <th className="py-3 px-4 text-[10px] font-bold uppercase text-gray-400 tracking-wider text-center">Risk Level</th>
                      <th className="py-3 px-6 text-[10px] font-bold uppercase text-gray-400 tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data?.potholes.map((p: any) => {
                      const loc = getLocality(p.localityId);
                      return (
                        <tr key={p.id} className="hover:bg-surface-muted transition-colors">
                          <td className="py-[14px] px-6">
                            <div className="text-[14px] font-[500] text-primary-g">{p.road}</div>
                            <div className="text-[12px] text-secondary-g font-[400] mt-0.5">{loc.name} • Ward {getWard(p.wardId).number}</div>
                          </td>
                          <td className="py-[14px] px-4 text-center">
                            <span className={cn(
                                "text-[10px] font-[600] px-2 py-0.5 rounded-[20px] tabular-nums",
                                p.daysOpen >= 30 ? "bg-[#fce8e6] text-[#c5221f]" : "bg-[#f1f3f4] text-[#5f6368]"
                            )}>
                              {p.daysOpen}d
                            </span>
                          </td>
                          <td className="py-[14px] px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className={cn(
                                "text-[10px] font-[600] px-[8px] py-[3px] rounded-[6px] uppercase",
                                p.size !== p.projectedSize ? "bg-[#fce8e6] text-[#c5221f]" : "bg-[#f1f3f4] text-[#5f6368]"
                              )}>
                                {p.size}
                              </span>
                              <ArrowRight className="h-[14px] w-[14px] text-[#9aa0a6]" />
                              <span className={cn(
                                "text-[10px] font-[600] px-[8px] py-[3px] rounded-[6px] uppercase",
                                p.size !== p.projectedSize ? "bg-[#fce8e6] text-[#c5221f]" : "bg-[#f1f3f4] text-[#5f6368]"
                              )}>
                                {p.projectedSize}
                              </span>
                            </div>
                          </td>
                          <td className="py-[14px] px-4 text-center">
                             <span className={cn(
                               "text-[10px] font-[500] px-[9px] py-[3px] rounded-full uppercase",
                               p.riskLevel === 'critical' ? 'bg-[#ea4335] text-white' : 'bg-[#f1f3f4] text-[#5f6368]'
                             )}>
                                {p.riskLevel}
                             </span>
                          </td>
                          <td className="py-[14px] px-6 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-[34px] w-[34px] rounded-full hover:bg-[#f1f3f4] hover:text-[#34a853] text-[#9aa0a6] transition-colors" onClick={() => handleAction(p.id, "repaired")}>
                                <CheckCircle2 className="h-[18px] w-[18px]" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-[34px] w-[34px] rounded-full hover:bg-[#f1f3f4] hover:text-[#1a73e8] text-[#9aa0a6] transition-colors">
                                <UserPlus className="h-[18px] w-[18px]" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="bg-white border-border shadow-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-50">
               <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                 <MapIcon className="h-4 w-4 text-blue-600" /> Progression Map
               </h3>
            </div>
            <div className="p-0">
               <PotholeMap potholes={data?.potholes ?? []} height="280px" showHeatmap={false} />
            </div>
            <div className="p-4 bg-gray-50 text-[10px] text-gray-500 font-medium leading-relaxed">
               Showing spatial distribution of deteriorating road segments. Areas with concentrated markers require immediate dispatch intervention.
            </div>
          </Card>

          <div className="card-data border-none shadow-[0_1px_3px_rgba(0,0,0,0.06)] rounded-[12px] space-y-5">
            <h3 className="text-[13px] font-[400] text-secondary-g flex items-center gap-2 m-0">
               <Bell className="h-[16px] w-[16px] text-[#1a73e8]" /> Notifications
            </h3>
            <div className="space-y-4">
               {[
                 { label: "New Critical Pothole", sub: "Old Airport Rd", time: "3m ago", color: "bg-[#ea4335]" },
                 { label: "SLA Warning", sub: "Richmond Circle", time: "12m ago", color: "bg-[#fbbc04]" },
                 { label: "Report Surge", sub: "Koramangala Ward", time: "1h ago", color: "bg-[#1a73e8]" }
               ].map((n, i) => (
                 <div key={i} className="flex gap-3 items-start">
                    <div className={cn("h-[8px] w-[8px] rounded-full mt-[5px] shrink-0", n.color)} />
                    <div className="flex-1 min-w-0">
                       <div className="text-[13px] font-[500] text-primary-g truncate">{n.label}</div>
                       <div className="flex justify-between items-center mt-0.5">
                         <span className="text-[11px] text-secondary-g truncate">{n.sub}</span>
                         <span className="text-[11px] text-[#9aa0a6] shrink-0 ml-2">{n.time}</span>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
            <Button variant="ghost" className="w-full text-[10px] font-[600] uppercase tracking-widest text-[#1a73e8] hover:bg-[#e8f0fe] rounded-[8px]">
               Manage Alerts <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
