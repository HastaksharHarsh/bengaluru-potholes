import { Trophy, Award, Medal, ChevronDown, ChevronUp, Loader2, Info, MapPin } from "lucide-react";
import React, { useEffect, useState, useMemo } from "react";
import { fetchPotholes } from "@/lib/api";
import { wards } from "@/lib/bengaluru-data";
import type { Pothole } from "../../backend/src/models/types";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  { bg: "#e8f0fe", text: "#4285f4" },
  { bg: "#e6f4ea", text: "#34a853" },
  { bg: "#fef7e0", text: "#fbbc04" },
  { bg: "#fce8e6", text: "#ea4335" },
  { bg: "#f3e8fd", text: "#9c27b0" },
  { bg: "#e0f2f1", text: "#009688" },
];

function getAvatarInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}

export default function WardRanking() {
  const [dbPotholes, setDbPotholes] = useState<Pothole[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    fetchPotholes({ limit: 5000 })
      .then((res) => setDbPotholes(res.potholes))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    return wards
      .map((w) => {
        const items = dbPotholes.filter((p) => p.wardId === w.id);
        const open = items.filter((p) => p.status !== "repaired");
        const fixed = items.filter((p) => p.status === "repaired");
        const breached = open.filter((p) => p.slaBreached).length;
        const fixRate = items.length === 0 ? 0 : fixed.length / items.length;
        // Formula: Repair rate - SLA breaches (normalized 0-100 for display logic)
        let rawScore = (fixRate * 100) - breached;
        const perf = Math.max(-20, Math.min(100, Math.round(rawScore)));
        return { w, total: items.length, open: open.length, fixed: fixed.length, breached, perf, recent: fixed.slice(0, 3) };
      })
      .sort((a, b) => b.perf - a.perf);
  }, [dbPotholes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--g-blue)]" />
      </div>
    );
  }

  const top = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="p-[24px] lg:p-[28px] space-y-[24px] animate-fade-in pb-[120px] lg:pb-[24px]">
      {/* ── Page Header ── */}
      <div className="hero-banner flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <div className="hero-banner-tag">BBMP WARD ACCOUNTABILITY</div>
          <h1 className="hero-banner-title">Ward Ranking</h1>
          <p className="hero-banner-subtitle">Score = fix rate − SLA breaches. Higher is better. Tap any ward to see pothole logs.</p>
        </div>
        <div className="group relative">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-[10px] text-[13px] font-[600] hover:bg-gray-50 transition-colors shadow-sm">
            <Info className="h-4 w-4" /> Score Formula
          </button>
          <div className="absolute right-0 top-full mt-2 w-64 p-4 bg-white shadow-lift-g border border-gray-100 rounded-[12px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <p className="text-[12px] font-[700] text-[#1a1f36] tracking-[0.05em] uppercase border-b border-gray-100 pb-2 mb-2">SCORE = REPAIR RATE − SLA BREACHES</p>
            <p className="text-[12px] text-secondary-g leading-relaxed">Calculates the percentage of fixed potholes, penalized directly by the number of active SLA breaches.</p>
          </div>
        </div>
      </div>

      {/* ── Top 3 Podium Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[12px]">
        {top.map((r, idx) => {
          const config = [
            { bg: "#fffbea", border: "#fbbc04", icon: Trophy, color: "#fbbc04", rank: "Gold" },
            { bg: "#f8f9fa", border: "#dadce0", icon: Medal, color: "#5f6368", rank: "Silver" },
            { bg: "#fff3e0", border: "#ffb74d", icon: Award, color: "#ff6d00", rank: "Bronze" }
          ][idx];
          const Icon = config.icon;
          
          return (
            <div 
              key={r.w.id} 
              className="p-[16px] rounded-[16px] border-[1.5px] relative overflow-hidden"
              style={{ backgroundColor: config.bg, borderColor: config.border }}
            >
              <div className="flex items-start justify-between mb-[16px]">
                <Icon className="h-[32px] w-[32px]" style={{ color: config.color }} />
                <div className="text-right">
                  <div className="text-label text-secondary-g uppercase tracking-[0.01em]">Rank #{idx + 1}</div>
                  <div className="text-display" style={{ color: r.perf >= 60 && idx === 0 ? "var(--g-green)" : config.color, fontSize: idx === 0 ? "36px" : "30px" }}>
                    {r.perf}
                  </div>
                </div>
              </div>
              
              <div className="mb-[12px]">
                <div className="text-[20px] font-[600] text-primary-g leading-tight">{r.w.name}</div>
                <div className="text-hint text-secondary-g">Ward {r.w.number}</div>
              </div>

              <div className="flex gap-2">
                <span className="g-chip bg-[#e6f4ea] text-[#137333]">{r.fixed} Fixed</span>
                <span className="g-chip bg-[#fce8e6] text-[#c5221f]">{r.breached} Breach</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Rankings Table ── */}
      <div className="bg-surface-card border border-default-g shadow-card-g rounded-[12px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-surface-muted border-b border-default-g h-[44px]">
                <th className="px-4 text-label text-secondary-g whitespace-nowrap w-[60px]">Rank</th>
                <th className="px-4 text-label text-secondary-g whitespace-nowrap">Ward + Zone</th>
                <th className="px-4 text-label text-secondary-g whitespace-nowrap">Authority</th>
                <th className="px-4 text-label text-secondary-g whitespace-nowrap text-right">Total</th>
                <th className="px-4 text-label text-secondary-g whitespace-nowrap text-center">Fixed</th>
                <th className="px-4 text-label text-secondary-g whitespace-nowrap text-center">Breach</th>
                <th className="px-4 text-label text-secondary-g whitespace-nowrap w-[200px]">Score</th>
                <th className="px-4 w-[40px]"></th>
              </tr>
            </thead>
            <tbody>
              {rest.map((r, idx) => {
                const globalRank = idx + 4;
                const isExpanded = expandedRow === r.w.id;
                const rowBg = idx % 2 === 0 ? "bg-[#ffffff]" : "bg-[#fafafa]";
                const avatarColor = AVATAR_COLORS[globalRank % AVATAR_COLORS.length];
                const positiveScore = r.perf > 0;
                
                return (
                  <React.Fragment key={r.w.id}>
                    <tr 
                      onClick={() => setExpandedRow(isExpanded ? null : r.w.id)}
                      className={cn(rowBg, "hover:bg-surface-active transition-colors cursor-pointer border-b border-default-g h-[64px]")}
                    >
                      <td className="px-4 text-body font-[500] text-secondary-g">#{globalRank}</td>
                      <td className="px-4 py-2">
                        <div className="text-body font-[500] text-primary-g">{r.w.name}</div>
                        <div className="text-hint text-secondary-g">Ward {r.w.number} · {r.w.zone}</div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <div 
                            className="h-[32px] w-[32px] rounded-full flex items-center justify-center text-[12px] font-[600]"
                            style={{ backgroundColor: avatarColor.bg, color: avatarColor.text }}
                          >
                            {getAvatarInitials(r.w.engineer || r.w.mla)}
                          </div>
                          <div>
                            <div className="text-[13px] text-primary-g">{r.w.engineer || r.w.mla}</div>
                            <div className="text-hint text-secondary-g">{r.w.constituency}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 text-body text-primary-g text-right">{r.total}</td>
                      <td className="px-4 text-center">
                        <span className="inline-block bg-[#e6f4ea] text-[#137333] rounded-[20px] px-2 py-0.5 text-[11px] font-[500]">{r.fixed} fixed</span>
                      </td>
                      <td className="px-4 text-center">
                        <span className={cn("inline-block rounded-[20px] px-2 py-0.5 text-[11px] font-[500]", r.breached > 0 ? "bg-[#fce8e6] text-[#c5221f]" : "bg-surface-muted text-secondary-g")}>
                          {r.breached} breaches
                        </span>
                      </td>
                      <td className="px-4">
                        <div className="w-full">
                          <div className="flex justify-between text-hint mb-1">
                            <span className="font-[500] text-primary-g">{r.perf}</span>
                          </div>
                          <div className="h-[6px] w-full bg-surface-muted rounded-[3px] overflow-hidden flex">
                            <div 
                              className="h-full rounded-[3px]"
                              style={{ 
                                width: `${Math.min(100, Math.max(0, positiveScore ? r.perf : 40))}%`,
                                background: positiveScore ? "linear-gradient(to right, #34a853, #1a73e8)" : "#ea4335"
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 text-right">
                        <button className="h-[32px] w-[32px] rounded-full flex items-center justify-center hover:bg-[rgba(0,0,0,0.04)] text-secondary-g">
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-surface-active/30 border-b border-default-g">
                        <td colSpan={8} className="p-4">
                          <div className="flex gap-6 max-w-4xl">
                            <div className="h-[120px] w-[200px] bg-surface-muted rounded-[8px] flex flex-col items-center justify-center border border-default-g shrink-0">
                              <MapPin className="h-6 w-6 text-secondary-g mb-2" />
                              <span className="text-label text-secondary-g">Map View Unavailable</span>
                            </div>
                            <div className="flex-1">
                              <h4 className="text-label text-secondary-g uppercase tracking-[0.01em] mb-2">Recent Repairs</h4>
                              {r.recent.length > 0 ? (
                                <div className="space-y-2">
                                  {r.recent.map(p => (
                                    <div key={p.id} className="flex items-center gap-2 text-body text-primary-g">
                                      <div className="h-2 w-2 rounded-full bg-[var(--g-green)]" />
                                      {p.road} <span className="text-hint text-secondary-g">— {new Date(p.reportedAt).toLocaleDateString()}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-body text-secondary-g">No recent repairs tracked.</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
