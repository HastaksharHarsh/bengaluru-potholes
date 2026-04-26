import { localities, getWard } from "@/lib/bengaluru-data";
import { fetchPotholes } from "@/lib/api";
import { Pothole } from "../../backend/src/models/types";
import { wards } from "@/lib/bengaluru-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, AlertTriangle, TrendingDown, TrendingUp, Minus } from "lucide-react";

function trendIcon(resolutionPct: number, slaBreachPct: number) {
  const score = resolutionPct - slaBreachPct / 2;
  if (score >= 20) return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (score <= -10) return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-amber-500" />;
}

export default function Localities() {
  const { t, lang } = useI18n();
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
      const low = items.filter(p => p.severity === "low").length;
      const slaBreached = items.filter(p => p.slaBreached).length;
      const slaBreachPct = total > 0 ? Math.round((slaBreached / total) * 100) : 0;
      const critPct = total > 0 ? Math.round((critical / total) * 100) : 0;

      return { l, ward, total, repaired, resolutionRate, critical, high, medium, low, slaBreached, slaBreachPct, critPct };
    });
  }, [dbPotholes]);

  // Sort worst first (most critical)
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => (b.critical * 4 + b.high * 3) - (a.critical * 4 + a.high * 3));
  }, [rows]);

  const cityTotal = rows.reduce((s, r) => s + r.total, 0);
  const cityRepaired = rows.reduce((s, r) => s + r.repaired, 0);
  const cityResolution = cityTotal > 0 ? Math.round((cityRepaired / cityTotal) * 100) : 0;

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl lg:text-2xl font-display font-bold">Localities Drilldown</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Select a locality to view ward-level details</p>
      </div>

      {/* City summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Potholes", value: cityTotal.toString(), sub: "city-wide", color: "text-foreground" },
          { label: "Localities", value: localities.length.toString(), sub: "tracked areas", color: "text-primary" },
          { label: "City Resolution", value: `${cityResolution}%`, sub: "avg repaired", color: cityResolution >= 25 ? "text-green-500" : "text-red-500" },
          { label: "Active Wards", value: wards.length.toString(), sub: "BBMP zones", color: "text-primary" },
        ].map(c => (
          <Card key={c.label} className="p-3 flex flex-col gap-0.5">
            <div className={`text-2xl font-bold font-display ${c.color}`}>{c.value}</div>
            <div className="text-xs font-semibold text-foreground">{c.label}</div>
            <div className="text-[10px] text-muted-foreground">{c.sub}</div>
          </Card>
        ))}
      </div>

      {/* Locality cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedRows.map((r, idx) => {
          const isWorst = idx === 0 && r.total > 0;
          return (
            <Card
              key={r.l.id}
              onClick={() => navigate(`/localities/${r.l.id}`)}
              className={`cursor-pointer group hover:shadow-lg transition-all duration-200 border-2 overflow-hidden
                ${isWorst ? "border-red-500/50 shadow-red-500/10 shadow-md" : "border-border hover:border-primary/40"}
              `}
            >
              {/* Severity gradient bar */}
              <div className="h-1.5 w-full" style={{
                background: r.total > 0
                  ? `linear-gradient(to right, #dc2626 ${r.critPct}%, #ea580c ${r.critPct + (r.total > 0 ? Math.round(r.high / r.total * 100) : 0)}%, #d97706 80%, #16a34a 100%)`
                  : "#e2e8f0",
              }} />

              <div className="p-4 space-y-3">
                {/* Name + trend */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      {isWorst && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                      <span className="font-display font-bold text-base leading-tight">
                        {lang === "kn" ? r.l.nameKn : r.l.name}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {r.ward ? `Ward ${r.ward.number} · ${r.ward.zone} Zone · ${r.ward.constituency}` : "1 Ward"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {trendIcon(r.resolutionRate, r.slaBreachPct)}
                    {isWorst && <Badge className="bg-red-500/10 text-red-600 border-red-200 text-[9px] px-1.5">Worst</Badge>}
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-1 text-center">
                  {[
                    { label: "Total", value: r.total, color: "text-foreground" },
                    { label: "Critical", value: r.critical, color: "text-red-500" },
                    { label: "Fixed", value: `${r.resolutionRate}%`, color: r.resolutionRate >= 25 ? "text-green-500" : "text-orange-500" },
                    { label: "SLA ⚡", value: `${r.slaBreachPct}%`, color: r.slaBreachPct >= 50 ? "text-red-500" : "text-amber-500" },
                  ].map(s => (
                    <div key={s.label} className="bg-muted/40 rounded-md py-1.5 px-1">
                      <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-[9px] text-muted-foreground leading-tight">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* MLA + Engineer + Traffic */}
                {r.ward && (
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <div><span className="font-semibold text-foreground">MLA:</span> {r.ward.mla}</div>
                    <div><span className="font-semibold text-foreground">Engineer:</span> {r.ward.engineer}</div>
                    <div><span className="font-semibold text-foreground">Traffic:</span> {r.l.trafficDensity}/100 density</div>
                  </div>
                )}

                {/* Click prompt */}
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="text-[10px] text-muted-foreground italic">
                    {isWorst ? "🔴 Highest severity — click to explore" : "Click to view locality details"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
