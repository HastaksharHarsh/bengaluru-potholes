import { localities, getWard } from "@/lib/bengaluru-data";
import { fetchPotholes } from "@/lib/api";
import { Pothole } from "../../backend/src/models/types";
import { wards } from "@/lib/bengaluru-data";
import { useI18n } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUp, ArrowDown, Minus, MapPin, CheckCircle, AlertTriangle, Building2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

function getAvatarInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}

function TrafficDots({ density }: { density: number }) {
  const activeDots = Math.ceil((density / 100) * 5);
  return (
    <div className="flex gap-[3px]">
      {[1, 2, 3, 4, 5].map(i => (
        <div 
          key={i} 
          className="h-[9px] w-[9px] rounded-full"
          style={{ backgroundColor: i <= activeDots ? "var(--text-secondary)" : "var(--border-default)" }}
        />
      ))}
    </div>
  );
}

export default function Localities() {
  const { lang } = useI18n();
  const navigate = useNavigate();

  const [dbPotholes, setDbPotholes] = useState<Pothole[]>([]);
  useEffect(() => {
    fetchPotholes().then(res => setDbPotholes(res.potholes));
  }, []);

  const rows = useMemo(() => {
    return localities.map((l) => {
      const ward = wards.find(w => w.id === l.wardId);
      const items = dbPotholes.filter((p) => p.localityId === l.id);
      const total = items.length;
      const repaired = items.filter(p => p.status === "repaired").length;
      const resolutionRate = total === 0 ? 0 : Math.round((repaired / total) * 100);
      const critical = items.filter(p => p.severity === "critical").length;
      const high = items.filter(p => p.severity === "high").length;
      const medium = items.filter(p => p.severity === "medium").length;
      const slaBreached = items.filter(p => p.slaBreached).length;
      const slaBreachPct = total > 0 ? Math.round((slaBreached / total) * 100) : 0;

      // Calculate main severity for badge
      let topSeverity = "HEALTHY";
      if (critical > 0) topSeverity = "CRITICAL";
      else if (high > 0) topSeverity = "HIGH";
      else if (medium > 0) topSeverity = "MEDIUM";

      return { l, ward, total, repaired, resolutionRate, critical, high, slaBreached, slaBreachPct, topSeverity };
    });
  }, [dbPotholes]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => b.resolutionRate - a.resolutionRate); // Just an example sort
  }, [rows]);

  const cityTotal = rows.reduce((s, r) => s + r.total, 0);
  const cityRepaired = rows.reduce((s, r) => s + r.repaired, 0);
  const cityResolution = cityTotal > 0 ? Math.round((cityRepaired / cityTotal) * 100) : 0;

  return (
    <div className="p-[24px] lg:p-[28px] space-y-[20px] animate-fade-in pb-[120px] lg:pb-[28px]">
      {/* ── Header ── */}
      <div className="hero-banner flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
        <div>
          <div className="hero-banner-tag">BBMP BENGALURU · WARD INTELLIGENCE</div>
          <h1 className="hero-banner-title">Neighborhood Analysis</h1>
          <p className="hero-banner-subtitle">Drill into ward-level infrastructure health</p>
        </div>
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-[600] text-green-700 bg-green-50 border border-green-100">
          <ArrowUp className="h-4 w-4" /> City is {cityResolution}% resolved
        </span>
      </div>

      {/* ── Summary Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[14px]">
        {[
          { label: "City-wide Cases", val: cityTotal, icon: AlertTriangle, cardClass: "stat-card-yellow", iconColor: "#d97706" },
          { label: "Tracked Areas",   val: localities.length, icon: MapPin, cardClass: "stat-card-blue",  iconColor: "#1a73e8" },
          { label: "Resolution Avg", val: `${cityResolution}%`, icon: TrendingUp, cardClass: "stat-card-green", iconColor: "#16a34a" },
          { label: "Active Wards",   val: wards.length, icon: Building2, cardClass: "stat-card-teal",  iconColor: "#00897b" },
        ].map((stat) => (
          <div key={stat.label} className={stat.cardClass}>
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className="h-[18px] w-[18px]" style={{ color: stat.iconColor }} />
              <div className="text-[22px] font-[700]" style={{ color: stat.iconColor }}>{stat.val}</div>
            </div>
            <div className="text-[12px] font-[500] text-secondary-g uppercase tracking-[0.03em]">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Locality Card Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
        {sortedRows.map((r) => {
          let trendChip = { bg: "#f1f3f4", color: "#5f6368", text: "stable", icon: Minus };
          const trendScore = r.resolutionRate - r.slaBreachPct;
          if (trendScore >= 20) trendChip = { bg: "#e6f4ea", color: "#137333", text: "improving", icon: TrendingUp };
          else if (trendScore <= -10) trendChip = { bg: "#fce8e6", color: "#c5221f", text: "needs attention", icon: ArrowDown };

          let sevBg = "var(--g-green)";
          let sevText = "#fff";
          if (r.topSeverity === "CRITICAL") sevBg = "var(--g-red)";
          else if (r.topSeverity === "HIGH") sevBg = "var(--g-orange)";
          else if (r.topSeverity === "MEDIUM") { sevBg = "var(--g-yellow)"; sevText = "#202124"; }

          return (
            <div
              key={r.l.id}
              onClick={() => navigate(`/localities/${r.l.id}`)}
              className="card-insight cursor-pointer group"
            >
              {/* Severity Badge */}
              <div 
                className="card-insight-badge px-[9px] py-[3px] text-[11px] font-[500] rounded-full uppercase tracking-wide"
                style={{ backgroundColor: sevBg, color: sevText }}
              >
                {r.topSeverity}
              </div>

              {/* Top Row */}
              <div className="flex items-start justify-between pr-[80px]">
                <div>
                  <div className="text-[15px] font-[600] text-primary-g leading-tight mb-1">{lang === "kn" ? r.l.nameKn : r.l.name}</div>
                  <div className="text-[13px] text-secondary-g">Ward {r.ward?.number} · {r.ward?.zone} Zone</div>
                </div>
              </div>

              {/* Trend Chip */}
              <div className="mt-3">
                <span className="inline-flex items-center gap-1.5 rounded-[20px] px-[10px] py-[4px] text-[12px] font-[500]" style={{ backgroundColor: trendChip.bg, color: trendChip.color }}>
                  <trendChip.icon className="h-[14px] w-[14px]" /> {trendChip.text}
                </span>
              </div>

              {/* Health Score Bar */}
              <div className="mt-[20px] space-y-2">
                <div className="flex justify-between items-center text-secondary-g">
                  <span className="text-[13px]">Health</span>
                  <span className="text-[16px] font-[600]" style={{ color: r.resolutionRate > 60 ? "var(--g-green)" : r.resolutionRate >= 40 ? "var(--g-yellow)" : "var(--g-red)" }}>
                    {r.resolutionRate}%
                  </span>
                </div>
                <div className="h-[6px] w-full bg-[#f1f3f4] rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full"
                    style={{ 
                      width: `${r.resolutionRate}%`, 
                      backgroundColor: r.resolutionRate > 60 ? "var(--g-green)" : r.resolutionRate >= 40 ? "var(--g-yellow)" : "var(--g-red)" 
                    }}
                  />
                </div>
              </div>

              {/* Stat Row */}
              <div className="flex gap-2 mt-[16px]">
                <div className="flex items-center gap-1.5 bg-[#f8f9fa] px-[8px] py-[4px] rounded-[6px] text-[11px] text-primary-g">
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--g-red)]" /> {r.critical} Critical
                </div>
                <div className="flex items-center gap-1.5 bg-[#f8f9fa] px-[8px] py-[4px] rounded-[6px] text-[11px] text-primary-g">
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--text-secondary)]" /> {r.total} Total
                </div>
                <div className="flex items-center gap-1.5 bg-[#f8f9fa] px-[8px] py-[4px] rounded-[6px] text-[11px] text-primary-g">
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--g-orange)]" /> {r.slaBreachPct}% Breach
                </div>
              </div>

              {/* Engineer Row */}
              <div className="flex items-center justify-between mt-[16px] pt-[16px] border-t border-[rgba(0,0,0,0.06)]">
                <div className="flex items-center gap-2">
                  <div className="h-[28px] w-[28px] rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center text-[11px] font-[600]">
                    {getAvatarInitials(r.ward?.engineer || "N A")}
                  </div>
                  <div className="text-[13px] font-[400] text-primary-g">{r.ward?.engineer}</div>
                </div>
                <TrafficDots density={r.l.trafficDensity} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
