import { Link } from "react-router-dom";
import { PotholeMap } from "@/components/maps/PotholeMap";
import { useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { localities, getLocality, BENGALURU_CENTER } from "@/lib/bengaluru-data";
import { fetchPotholes, updatePotholeStatus } from "@/lib/api";
import { Pothole } from "../../backend/src/models/types";
import { useAppStore } from "@/lib/store";
import {
  AlertTriangle, CheckCircle, Clock, Star, MapPin,
  Loader2, ShieldCheck, TrendingUp, ArrowRight, Zap, Activity,
  Brain, ShieldAlert, Lightbulb
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// ── Urgent Dispatches Panel ────────────────────────────────────────────────
function UrgentDispatches({ potholes, onRepair }: { potholes: Pothole[]; onRepair: (id: string) => Promise<void> }) {
  const [selectedTask, setSelectedTask] = useState<Pothole | null>(null);
  const [repairing, setRepairing] = useState(false);

  const urgent = potholes
    .filter(p => p.status !== "repaired" && (p.severity === "critical" || p.severity === "high"))
    .sort((a, b) => b.severityScore - a.severityScore)
    .slice(0, 4);

  const handleConfirmRepair = async () => {
    if (!selectedTask) return;
    setRepairing(true);
    try {
      await onRepair(selectedTask.id);
      await new Promise(r => setTimeout(r, 600));
      setSelectedTask(null);
    } catch (err) {
      console.error(err);
    } finally {
      setRepairing(false);
    }
  };

  return (
    <div className="rounded-[16px] overflow-hidden border border-[#cbd5e1] shadow-sm">
      {/* Gradient Header */}
      <div
        className="flex items-center justify-between px-5 h-[52px]"
        style={{ background: "linear-gradient(135deg, #c62828 0%, #ea4335 50%, #ff6d00 100%)" }}
      >
        <div className="flex items-center gap-2">
          <Zap className="h-[16px] w-[16px] text-white/80" />
          <h2 className="text-[15px] font-[700] text-white m-0">Urgent Dispatches</h2>
        </div>
        <span className="text-[11px] font-[600] px-3 py-1 rounded-full text-red-100"
          style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>
          PRIORITY
        </span>
      </div>

      {urgent.length === 0 ? (
        <div className="text-[13px] text-secondary-g py-5 px-5 bg-white flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" /> No urgent dispatches right now.
        </div>
      ) : (
        <div className="flex flex-col bg-white divide-y divide-[rgba(0,0,0,0.05)]">
          {urgent.map((p) => {
            const isCritical = p.severity === "critical";
            const colorToken = isCritical ? "#ea4335" : "#ff6d00";
            return (
              <div key={p.id} className="relative flex items-center justify-between p-[14px_16px_14px_20px] hover:bg-red-50/30 transition-all duration-150 group">
                <div className="absolute left-0 top-0 bottom-0 w-[4px]" style={{ backgroundColor: colorToken }} />
                <div className="flex-1 min-w-0 pl-2">
                  <div className="text-[14px] font-[600] text-[#1a1f36] truncate">{p.road}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-secondary-g bg-gray-100">
                      <MapPin className="h-3 w-3" /> {getLocality(p.localityId).name}
                    </span>
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-[700] text-white uppercase"
                      style={{ backgroundColor: colorToken }}>
                      {p.severity}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTask(p)}
                  className="h-[34px] px-4 rounded-[8px] text-white text-[12px] font-[600] transition-all hover:scale-105 ml-3"
                  style={{ background: "linear-gradient(135deg, #ea4335 0%, #c62828 100%)" }}
                >
                  Fix
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedTask} onOpenChange={(o) => !o && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-md rounded-[16px]" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
          <DialogHeader>
            <DialogTitle className="text-[18px] font-[700]">Repair Verification</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-[12px] space-y-3" style={{ background: "linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)" }}>
                <div className="grid grid-cols-2 gap-4 text-[13px]">
                  <div>
                    <div className="text-secondary-g font-[500] mb-0.5">Location</div>
                    <div className="font-[600] text-[#1a1f36]">{selectedTask.road}</div>
                  </div>
                  <div>
                    <div className="text-secondary-g font-[500] mb-0.5">Locality</div>
                    <div className="font-[600] text-[#1a1f36]">{getLocality(selectedTask.localityId).name}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-[10px] bg-blue-50 text-blue-700 text-[13px]">
                <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
                <p>Marking as repaired will update the city-wide live map and notify subscribers.</p>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <button onClick={() => setSelectedTask(null)} disabled={repairing}
              className="h-[40px] px-4 rounded-[8px] font-[500] text-secondary-g hover:bg-gray-100 transition-colors border border-gray-200">
              Cancel
            </button>
            <button onClick={handleConfirmRepair} disabled={repairing}
              className="h-[40px] px-6 rounded-[8px] text-white font-[600] flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #ea4335 0%, #c62828 100%)" }}>
              {repairing && <Loader2 className="h-4 w-4 animate-spin" />} Confirm Repair
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// ── Recent Activity Logs ───────────────────────────────────────────────────
function RecentActivityLogs({ potholes }: { potholes: Pothole[] }) {
  const events = useMemo(() => {
    const arr: { type: "REPORTED" | "FIXED"; time: Date; p: Pothole }[] = [];
    for (const p of potholes) {
      arr.push({ type: "REPORTED", time: new Date(p.reportedAt), p });
      if (p.status === "repaired" && p.repairedAt) {
        arr.push({ type: "FIXED", time: new Date(p.repairedAt), p });
      }
    }
    return arr.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 6);
  }, [potholes]);

  return (
    <div className="rounded-[16px] p-[20px] overflow-hidden bg-white border border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <Activity className="h-[16px] w-[16px] text-[#1a73e8]" />
        <div className="text-[13px] font-[700] text-[#1a1f36] uppercase tracking-[0.04em]">Recent Activity Logs</div>
      </div>
      <div className="space-y-4">
        {events.map((ev, i) => {
          const isFixed = ev.type === "FIXED";
          const isCritical = ev.p.severity === "critical";
          const timeStr = ev.time.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

          return (
            <div key={`${ev.p.id}-${ev.type}-${i}`} className="flex gap-3">
              <div className="mt-0.5 shrink-0">
                {isFixed ? (
                  <div className="h-[28px] w-[28px] rounded-full bg-green-50 border border-green-100 text-green-600 flex items-center justify-center">
                    <CheckCircle className="h-[14px] w-[14px]" />
                  </div>
                ) : (
                  <div className={`h-[28px] w-[28px] rounded-full flex items-center justify-center ${isCritical ? 'bg-red-50 border-red-100 text-red-600' : 'bg-orange-50 border-orange-100 text-orange-600'}`}>
                    <AlertTriangle className="h-[14px] w-[14px]" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-[600] text-gray-900 leading-tight flex items-center gap-2">
                  {isFixed ? "Pothole Repaired" : "Hazard Reported"}
                  {!isFixed && (
                    <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${isCritical ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {ev.p.severity}
                    </span>
                  )}
                </p>
                <p className="text-[12px] text-gray-500 mt-0.5 truncate">
                  {ev.p.road} · {getLocality(ev.p.localityId).name}
                </p>
                <p className="text-[11px] font-[500] text-gray-400 mt-1">
                  {timeStr}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Nearby AI Analysis Panel (Citizens only) ──────────────────────────────
function NearbyAIAnalysis({ potholes }: { potholes: Pothole[] }) {
  const nearby = useMemo(() => {
    return potholes
      .filter(p => p.status !== "repaired")
      .sort((a, b) => b.severityScore - a.severityScore)
      .slice(0, 6);
  }, [potholes]);

  const criticalCount = nearby.filter(p => p.severity === "critical").length;
  const highCount     = nearby.filter(p => p.severity === "high").length;
  const slaBreached   = nearby.filter(p => p.slaBreached).length;
  const topHazard     = nearby[0];

  const riskScore = nearby.length === 0 ? 0
    : Math.min(100, Math.round(
        (criticalCount * 30 + highCount * 15 + slaBreached * 10) / Math.max(1, nearby.length) * 3
      ));

  const riskLabel = riskScore >= 70 ? "High Risk" : riskScore >= 40 ? "Moderate" : "Low Risk";
  const riskColor = riskScore >= 70 ? "#dc2626"   : riskScore >= 40 ? "#d97706"  : "#16a34a";
  const riskBg    = riskScore >= 70 ? "#fee2e2"   : riskScore >= 40 ? "#fef3c7"  : "#dcfce7";

  const insights = [
    criticalCount > 0
      ? `${criticalCount} critical hazard${criticalCount > 1 ? "s" : ""} detected in your locality — immediate caution advised.`
      : "No critical hazards currently active in your area.",
    slaBreached > 0
      ? `${slaBreached} pothole${slaBreached > 1 ? "s have" : " has"} breached the BBMP repair SLA — consider filing an escalation.`
      : "All nearby potholes are within the SLA repair window.",
    nearby.length > 0
      ? `AI predicts ${Math.min(nearby.length, 3)} cluster${nearby.length > 1 ? "s" : ""} of road damage forming based on rainfall and traffic patterns.`
      : "No significant pothole clusters detected in your area.",
  ];

  return (
    <div className="rounded-[16px] overflow-hidden border border-[#cbd5e1] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-[52px] bg-[#1e293b]">
        <div className="flex items-center gap-2">
          <Brain className="h-[16px] w-[16px] text-blue-400" />
          <h2 className="text-[15px] font-[700] text-white m-0">AI Nearby Analysis</h2>
        </div>
        <span className="text-[10px] font-[700] px-2.5 py-1 rounded-full tracking-wider"
          style={{ background: riskBg, color: riskColor }}>
          {riskLabel.toUpperCase()}
        </span>
      </div>

      <div className="bg-white divide-y divide-gray-100">
        {/* Risk score bar */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-[600] text-gray-500 uppercase tracking-wider">Area Risk Score</span>
            <span className="text-[15px] font-[700]" style={{ color: riskColor }}>{riskScore}/100</span>
          </div>
          <div className="h-[6px] w-full rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${riskScore}%`, backgroundColor: riskColor }} />
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Based on {nearby.length} active hazards · Yelahanka area</p>
        </div>

        {/* Top hazard */}
        {topHazard && (
          <div className="px-5 py-4">
            <div className="text-[11px] font-[700] text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldAlert className="h-[12px] w-[12px]" /> Highest Risk Nearby
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[14px] font-[600] text-gray-900">{topHazard.road}</div>
                <div className="text-[12px] text-gray-500 mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {getLocality(topHazard.localityId).name}
                </div>
              </div>
              <span className="text-[11px] font-[700] px-2.5 py-1 rounded-full uppercase"
                style={{
                  backgroundColor: topHazard.severity === "critical" ? "#fee2e2" : "#ffedd5",
                  color: topHazard.severity === "critical" ? "#dc2626" : "#ea580c"
                }}>
                {topHazard.severity}
              </span>
            </div>
          </div>
        )}

        {/* AI Insights */}
        <div className="px-5 py-4 space-y-3">
          <div className="text-[11px] font-[700] text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Lightbulb className="h-[12px] w-[12px] text-amber-500" /> AI Insights
          </div>
          {insights.map((insight, i) => (
            <div key={i} className="flex gap-2.5">
              <div className="h-[18px] w-[18px] rounded-full bg-blue-50 border border-blue-100 text-[#1a73e8] flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[9px] font-[700]">{i + 1}</span>
              </div>
              <p className="text-[12px] text-gray-600 leading-relaxed">{insight}</p>
            </div>
          ))}
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          <div className="py-3 flex flex-col items-center">
            <div className="text-[18px] font-[700] text-red-600">{criticalCount}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Critical</div>
          </div>
          <div className="py-3 flex flex-col items-center">
            <div className="text-[18px] font-[700] text-amber-600">{highCount}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">High</div>
          </div>
          <div className="py-3 flex flex-col items-center">
            <div className="text-[18px] font-[700] text-[#1a73e8]">{slaBreached}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">SLA Breach</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { isSupervisor, bumpVersion, version } = useAppStore();
  const [dbPotholes, setDbPotholes] = useState<Pothole[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  useEffect(() => {
    fetchPotholes().then(res => setDbPotholes(res.potholes)).catch(console.error).finally(() => setLoadingDb(false));
  }, [version]);

  const activeCount    = dbPotholes.filter(p => p.status !== "repaired").length;
  const totalFixedCount = dbPotholes.filter(p => p.status === "repaired").length;
  const breachedCount  = dbPotholes.filter(p => p.status !== "repaired" && p.slaBreached).length;
  const qualityCount   = dbPotholes.filter(p => p.reoccurred).length;

  const handleRepair = async (id: string) => {
    await updatePotholeStatus(id, "repaired");
    bumpVersion();
  };

  const stats = [
    {
      label: "Unresolved",
      value: activeCount,
      icon: AlertTriangle,
      cardClass: "stat-card-yellow",
      iconColor: "#d97706",
      trend: "Active hazards"
    },
    {
      label: "Repaired",
      value: totalFixedCount,
      icon: CheckCircle,
      cardClass: "stat-card-green",
      iconColor: "#16a34a",
      trend: "Fixed this month"
    },
    {
      label: "SLA Breached",
      value: breachedCount,
      icon: Clock,
      cardClass: breachedCount > 0 ? "stat-card-red" : "stat-card-green",
      iconColor: breachedCount > 0 ? "#dc2626" : "#16a34a",
      trend: breachedCount > 0 ? "Needs escalation" : "All within SLA"
    },
    {
      label: "Quality Issues",
      value: qualityCount,
      icon: Activity,
      cardClass: "stat-card-purple",
      iconColor: "#7c3aed",
      trend: "Re-opened cases"
    },
  ];

  return (
    <div className="p-[24px] lg:p-[28px] space-y-[20px] animate-fade-in pb-[120px] lg:pb-[28px]">

      {/* ── Hero Banner ── */}
      <div className="hero-banner">
        <div className="flex flex-col gap-4">
          {/* Text */}
          <div>
            <div className="hero-banner-tag">
              {isSupervisor ? "SUPERVISOR DASHBOARD · BBMP" : "SMART CITY POTHOLE INTELLIGENCE · BBMP"}
            </div>
            <h1 className="hero-banner-title">
              {isSupervisor ? "Command Center" : "PlotHole"}
            </h1>
            <p className="hero-banner-subtitle max-w-md">
              {isSupervisor
                ? "Manage repairs, monitor ward performance, and track SLA compliance."
                : "Real-time pothole intelligence — anonymous, AI-prioritized, ward-accountable."}
            </p>
          </div>

          {/* Actions row */}
          <div className="flex flex-wrap items-center gap-3">
            {!isSupervisor ? (
              <>
                <Link
                  to="/report"
                  className="inline-flex items-center justify-center h-[42px] px-5 rounded-[10px] text-[14px] font-[600] text-white bg-[#1a73e8] transition-all hover:bg-[#1557b0] shadow-sm"
                >
                  Report Pothole
                </Link>
                <Link
                  to="/reports"
                  className="inline-flex items-center justify-center h-[42px] px-5 rounded-[10px] text-[14px] font-[500] text-[#1a73e8] bg-[#e8f0fe] transition-all hover:bg-[#d2e3fc]"
                >
                  View Reports
                </Link>
                <div className="hidden md:flex items-center gap-3 bg-gray-50 rounded-[12px] p-3 border border-gray-100 shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-[#1a73e8] shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-[600] text-gray-500 uppercase tracking-wider">Your Location</div>
                    <div className="text-[13px] font-[600] text-gray-900 leading-tight mt-0.5">Yelahanka</div>
                    <div className="text-[11px] text-gray-500 font-mono mt-0.5">13.1150, 77.6347</div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/report"
                  className="inline-flex items-center justify-center h-[42px] px-5 rounded-[10px] text-[14px] font-[600] text-white bg-[#1a73e8] transition-all hover:bg-[#1557b0] shadow-sm"
                >
                  Dispatch Repairs
                </Link>
                <Link
                  to="/reports"
                  className="inline-flex items-center justify-center h-[42px] px-5 rounded-[10px] text-[14px] font-[500] text-[#1a73e8] bg-[#e8f0fe] transition-all hover:bg-[#d2e3fc]"
                >
                  View Reports
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Colourful Stat Cards ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
        {stats.map((s, i) => (
          <div key={i} className={s.cardClass}>
            <div className="flex justify-between items-start mb-3">
              <div
                className="h-[40px] w-[40px] rounded-[10px] flex items-center justify-center"
                style={{ background: `${s.iconColor}18` }}
              >
                <s.icon className="h-[20px] w-[20px]" style={{ color: s.iconColor }} />
              </div>
            </div>
            <div className="text-[32px] font-[700] leading-tight" style={{ color: s.iconColor }}>{s.value}</div>
            <div className="text-[13px] font-[600] text-[#1a1f36] mt-0.5">{s.label}</div>
            <div className="text-[11px] text-secondary-g mt-1">{s.trend}</div>
          </div>
        ))}
      </section>

      {/* ── Main Layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-[20px]">

        {/* Map */}
        <div className="xl:col-span-2">
          <div className="rounded-[16px] overflow-hidden h-[520px] flex flex-col bg-white border border-[#cbd5e1] shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e8f0]">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-[16px] w-[16px] text-[#1a73e8]" />
                  <h3 className="text-[15px] font-[700] text-[#1a1f36] m-0">Live Hazard Map</h3>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  {[
                    ["#ea4335", "Critical"], ["#ff6d00", "High"],
                    ["#fbbc04", "Medium"], ["#1a73e8", "Low"], ["#34a853", "Repaired"]
                  ].map(([col, lbl]) => (
                    <div key={lbl} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: col }} />
                      <span className="text-[11px] font-[500] text-secondary-g">{lbl}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link to="/map" className="text-[12px] font-[600] text-[#1a73e8] hover:underline flex items-center gap-1">
                Full screen <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex-1 relative">
              {loadingDb ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-[#1a73e8] animate-spin" />
                </div>
              ) : (
                <PotholeMap potholes={dbPotholes} height="100%" showHeatmap={false} />
              )}
            </div>
          </div>
          
          <div className="mt-8">
            <RecentActivityLogs potholes={dbPotholes} />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-[20px]">
          {isSupervisor
            ? <UrgentDispatches potholes={dbPotholes} onRepair={handleRepair} />
            : <NearbyAIAnalysis potholes={dbPotholes} />
          }

          {/* Ward Performance */}
          <div className="rounded-[16px] p-[20px] overflow-hidden bg-white border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="h-[16px] w-[16px] text-[#1a73e8]" />
              <div className="text-[13px] font-[700] text-[#1a1f36] uppercase tracking-[0.04em]">Ward Performance</div>
            </div>
            <div className="space-y-4">
              {localities.slice(0, 5).map((l) => {
                const items = dbPotholes.filter(p => p.localityId === l.id && p.status !== "repaired");
                const score = Math.max(0, 100 - items.length * 10);
                const colorFam = score > 70 ? "#16a34a" : score > 40 ? "#d97706" : "#dc2626";
                const bgFam = score > 70 ? "#dcfce7" : score > 40 ? "#fef3c7" : "#fee2e2";
                return (
                  <div key={l.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-[500] text-[#1a1f36] truncate mr-2">{l.name}</span>
                      <span className="text-[13px] font-[700] px-2 py-0.5 rounded-full" style={{ color: colorFam, backgroundColor: bgFam }}>
                        {score}%
                      </span>
                    </div>
                    <div className="h-[7px] w-full rounded-full overflow-hidden" style={{ backgroundColor: `${colorFam}25` }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: colorFam }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
