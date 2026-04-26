import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchPotholes } from "@/lib/api";
import { wards, localities } from "@/lib/bengaluru-data";
import type { Pothole } from "../../backend/src/models/types";
import { Printer, ArrowLeft, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Helpers ─────────────────────────────────────────────────────────────

function formatDate(d: Date) {
  const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const ord = (n: number) => n + (n===1?"st":n===2?"nd":n===3?"rd":"th");
  return `${DAYS[d.getDay()]} ${ord(d.getDate())} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

// ── Adapted to project blue/slate theme ───────────────────────────────────
const S = {
  accent:  "#1a73e8",        // Google blue — replaces rust
  dark:    "#1e293b",        // Slate-900 — replaces dark brown
  cream:   "#f8faff",        // Very light blue-white — replaces warm cream
  border:  "#cbd5e1",        // Slate-300
  gold:    "#93c5fd",        // Light blue — replaces gold
  muted:   "#94a3b8",        // Slate-400
  darkBdr: "#334155",        // Slate-700
  body:    "#374151",        // Gray-700
};

// ── Content generator ────────────────────────────────────────────────────

function buildContent(ward: typeof wards[0], loc: typeof localities[0] | undefined, ps: Pothole[], cityResolutionPct: number, cityTotal: number) {
  const total    = ps.length;
  const critical = ps.filter(p => p.severity === "critical").length;
  const high     = ps.filter(p => p.severity === "high").length;
  const medium   = ps.filter(p => p.severity === "medium").length;
  const low      = ps.filter(p => p.severity === "low").length;
  const repaired = ps.filter(p => p.status === "repaired").length;
  const resPct   = total > 0 ? Math.round((repaired / total) * 100) : 0;
  const slaB     = ps.filter(p => p.slaBreached).length;
  const slaPct   = total > 0 ? Math.round((slaB / total) * 100) : 0;
  const avgDays  = total > 0 ? Math.round(ps.reduce((s, p) => s + (p.daysOpen ?? 0), 0) / total) : 0;
  const maxDays  = total > 0 ? Math.max(...ps.map(p => p.daysOpen ?? 0)) : 0;
  const pending  = total - repaired;
  const critPct  = total > 0 ? Math.round((critical / total) * 100) : 0;
  const isArterial = loc?.isArterial ?? false;
  const traffic  = loc?.trafficDensity ?? 70;

  const worsening = slaPct > 50 && resPct < 20;
  const improving = resPct > 25 && slaPct < 40;
  const trendLabel = worsening ? "📉 Worsening" : improving ? "📈 Improving" : "→ Stable";

  const topNews = [
    {
      title: `Ward ${ward.number} Logs ${total} Potholes — And Only Fixed ${resPct}% of Them`,
      content: `${ward.name} currently has ${total} active potholes tracked, with ${repaired} repaired (${resPct}%). The remaining ${pending} are free-ranging, thriving without maintenance, and appear to be enjoying excellent job security.`,
    },
    {
      title: `${slaPct}% of Ward ${ward.number} Potholes Breach SLA — Civic Calendars Remain Unaware`,
      content: `${slaB} of ${total} potholes have exceeded their mandated fix window. The worst offenders have been open for up to ${maxDays} days. The 6-hour SLA for critical cases remains an aspirational concept in ${ward.name}.`,
    },
    {
      title: `${critPct}% Critical Severity — ${ward.name} Competes for Most Dramatic Road`,
      content: `With ${critical} critical and ${high} high-severity potholes, ${ward.name}'s road health score is best described as "technically a road." For context, the city average resolution rate is ${cityResolutionPct}% — ${ward.name}'s ${resPct}% is${resPct >= cityResolutionPct ? " above" : " below"} that bar.`,
    },
  ];

  const mainArticle = {
    col1: `${ward.name} — Ward ${ward.number} of the ${ward.zone} Zone — has logged ${total} potholes across its roads, of which a striking ${critical} are classified as critical and ${high} as high-severity. That's ${critPct}% of all potholes here operating at maximum damage potential.${isArterial ? ` As an arterial corridor with a traffic density of ${traffic}/100, every unrepaired crater is a multiplied impact on thousands of daily commuters.` : ` With a traffic density of ${traffic}/100, these ${total} active hazards create significant daily friction.`} Resolution rate stands at a humble ${resPct}%, leaving ${pending} potholes to continue their solo performances on public roads.`,
    col2: `SLA compliance is another story: ${slaPct}% of Ward ${ward.number}'s potholes have breached their mandatory fix window, with cases open for an average of ${avgDays} days and a champion crater persisting for ${maxDays} days. By comparison, the city average resolution rate is ${cityResolutionPct}%, which means ${ward.name} is ${resPct >= cityResolutionPct ? "outperforming the city average — a genuine surprise" : "below the city average — a genuine problem"}. Trend analysis: ${trendLabel}. Engineer ${ward.engineer} (${ward.contact}) is the designated respondent for Ward ${ward.number}. Whether they have received this newsletter is, at this point, an open question.`,
  };

  const solutions = {
    s1: `Real-Time SLA Alerts: With ${slaPct}% SLA breach rate in ${ward.name}, automated escalation alerts to ${ward.engineer} at ${ward.contact} when a pothole crosses its time window would convert ${ward.name}'s chronic delays into trackable, accountable events.`,
    s2: `AI Cluster Prioritisation: The PlotHole system already computes geospatial risk scores. Connecting ${ward.name}'s ${critical + high} critical/high potholes directly to work-order generation — prioritised by traffic impact (${traffic}/100 here) — could cut resolution time by up to 40%.`,
    s3: `The Frequent Flyer Programme: Potholes that have been "in progress" for more than 7 days in ${ward.name} should automatically receive a personalised follow-up from the BBMP app, a badge of civic shame, and — just as a thought — an actual repair crew.`,
  };

  const mlaCaption = `MLA ${ward.mla}, ${ward.constituency} Constituency — overseeing development in Ward ${ward.number}. ${pending} potholes are patiently overseeing back.`;
  const footer = `📍 ${ward.name} has ${total} potholes. You know ${pending} of them personally. Report the rest on PlotHole — before they name one after you.`;

  return { total, critical, high, medium, low, repaired, resPct, slaB, slaPct, avgDays, maxDays, pending, critPct, trendLabel, topNews, mainArticle, solutions, mlaCaption, footer };
}

// ── Fallback stats (offline) ─────────────────────────────────────────────
const FALLBACK_PS: Record<string, { total: number; critical: number; high: number; medium: number; low: number; repaired: number; slaB: number; avgDays: number; maxDays: number }> = {
  "w-150": { total: 18, critical: 7, high: 6, medium: 3, low: 2, repaired: 3, slaB: 11, avgDays: 11, maxDays: 18 },
  "w-117": { total: 18, critical: 8, high: 6, medium: 3, low: 1, repaired: 2, slaB: 12, avgDays: 12, maxDays: 17 },
  "w-080": { total: 14, critical: 3, high: 4, medium: 4, low: 3, repaired: 4, slaB: 5,  avgDays: 7,  maxDays: 15 },
  "w-072": { total: 14, critical: 3, high: 4, medium: 5, low: 2, repaired: 3, slaB: 6,  avgDays: 8,  maxDays: 14 },
  "w-176": { total: 17, critical: 8, high: 5, medium: 3, low: 1, repaired: 2, slaB: 12, avgDays: 13, maxDays: 18 },
  "w-189": { total: 15, critical: 5, high: 5, medium: 4, low: 1, repaired: 3, slaB: 9,  avgDays: 10, maxDays: 16 },
  "w-097": { total: 16, critical: 5, high: 6, medium: 3, low: 2, repaired: 3, slaB: 9,  avgDays: 9,  maxDays: 15 },
  "w-112": { total: 16, critical: 5, high: 6, medium: 4, low: 1, repaired: 3, slaB: 9,  avgDays: 10, maxDays: 16 },
  "w-006": { total: 12, critical: 2, high: 3, medium: 4, low: 3, repaired: 4, slaB: 3,  avgDays: 5,  maxDays: 12 },
  "w-198": { total: 17, critical: 7, high: 5, medium: 3, low: 2, repaired: 3, slaB: 11, avgDays: 12, maxDays: 17 },
};

function makeFallbackPotholes(wardId: string): Pothole[] {
  const f = FALLBACK_PS[wardId];
  if (!f) return [];
  const sevs: Array<[string, number]> = [["critical", f.critical], ["high", f.high], ["medium", f.medium], ["low", f.low]];
  const out: Pothole[] = [];
  let i = 0;
  for (const [sev, cnt] of sevs) {
    for (let n = 0; n < cnt; n++) {
      const days = sev === "critical" ? f.maxDays - n : Math.max(1, f.avgDays - n);
      const isRepaired = i < f.repaired;
      out.push({
        id: `fb-${wardId}-${++i}`,
        localityId: `loc-${wardId.replace("w-", "")}`,
        wardId,
        position: { lat: 12.97, lng: 77.59 },
        severity: sev as any,
        severityScore: sev === "critical" ? 85 : sev === "high" ? 65 : sev === "medium" ? 45 : 25,
        size: "medium",
        status: isRepaired ? "repaired" : days > 10 ? "verified" : "reported",
        reports: 5,
        reportedAt: new Date(Date.now() - days * 86400000).toISOString(),
        daysOpen: days,
        road: "Main Rd",
        upvotes: 3,
        slaHours: sev === "critical" ? 6 : sev === "high" ? 24 : 72,
        slaBreached: i <= f.slaB,
      } as Pothole);
    }
  }
  return out;
}

// ── Component ─────────────────────────────────────────────────────────────

export default function NewsletterWard() {
  const { wardId } = useParams<{ wardId: string }>();
  const navigate   = useNavigate();
  const ward = wards.find(w => w.id === wardId);
  const loc  = localities.find(l => l.wardId === wardId);

  const [allPotholes, setAllPotholes] = useState<Pothole[]>([]);
  const [loading, setLoading]         = useState(true);
  const [offline, setOffline]         = useState(false);

  useEffect(() => {
    if (!wardId) return;
    fetchPotholes({ limit: 500 })
      .then(res => setAllPotholes(res.potholes))
      .catch(() => { setAllPotholes([]); setOffline(true); })
      .finally(() => setLoading(false));
  }, [wardId]);

  const wardPotholes = useMemo(() => {
    if (offline) return makeFallbackPotholes(wardId ?? "");
    return allPotholes.filter(p => p.wardId === wardId);
  }, [allPotholes, wardId, offline]);

  const cityTotal       = allPotholes.length || Object.values(FALLBACK_PS).reduce((s, f) => s + f.total, 0);
  const cityRepaired    = allPotholes.filter(p => p.status === "repaired").length || Object.values(FALLBACK_PS).reduce((s, f) => s + f.repaired, 0);
  const cityResolutionPct = cityTotal > 0 ? Math.round((cityRepaired / cityTotal) * 100) : 16;

  const d = useMemo(() => {
    if (!ward) return null;
    return buildContent(ward, loc, wardPotholes, cityResolutionPct, cityTotal);
  }, [ward, loc, wardPotholes, cityResolutionPct, cityTotal]);

  const today = formatDate(new Date());

  if (!ward) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Ward not found.</p>
        <Button variant="ghost" onClick={() => navigate("/newsletter")} className="mt-4">← Back</Button>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center text-gray-400 animate-pulse">Loading ward data…</div>;
  if (!d) return null;

  const badges = [
    { label: `${d.critical} Critical`, color: "#dc2626" },
    { label: `${d.high} High`,         color: "#ea580c" },
    { label: `${d.medium} Medium`,     color: "#d97706" },
    { label: `${d.low} Low`,           color: "#16a34a" },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-4 animate-fade-in">

      {/* ── Controls bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/newsletter")} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> All Wards
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2 text-[#1a1f36]">
              <Newspaper className="h-5 w-5 text-[#1a73e8]" />
              Ward {ward.number} — {ward.name}
            </h1>
            <p className="text-xs text-gray-500">
              {d.total} potholes · {d.resPct}% resolved
              {offline && <span className="text-amber-500 ml-2">⚠ estimated data</span>}
            </p>
          </div>
        </div>
        <Button onClick={() => window.print()} size="sm" className="gap-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white">
          <Printer className="h-4 w-4" /> Print / PDF
        </Button>
      </div>

      {/* ══════════════ THE NEWSPAPER ══════════════ */}
      <div id="newsletter-print" style={{
        fontFamily: "'Georgia', 'Times New Roman', serif",
        background: S.cream,
        maxWidth: 720,
        margin: "0 auto",
        boxShadow: "0 8px 40px rgba(26,115,232,0.18)",
        borderRadius: 4,
        overflow: "hidden",
        border: `1px solid ${S.border}`,
      }}>

        {/* Blue top accent */}
        <div style={{ background: `linear-gradient(90deg, ${S.accent} 0%, #1557b0 100%)`, height: 8 }} />

        {/* Masthead */}
        <div style={{ textAlign: "center", padding: "14px 24px 2px", fontSize: 52, fontWeight: 900, letterSpacing: 6, color: S.dark, textTransform: "uppercase", lineHeight: 1 }}>
          NEWSLETTER
        </div>
        <div style={{ textAlign: "center", fontSize: 11, color: "#4a6fa5", fontFamily: "sans-serif", paddingBottom: 4, letterSpacing: 1 }}>
          PLOTHOLE · BBMP BENGALURU · WARD {ward.number} CIVIC EDITION
        </div>

        {/* Date bar */}
        <div style={{ background: S.accent, display: "flex", justifyContent: "space-between", padding: "5px 20px", fontSize: 11, fontStyle: "italic", color: "#fff", fontWeight: 600 }}>
          <span>{today}</span>
          <span>{ward.name} · {ward.zone} Zone · {ward.constituency}</span>
        </div>

        {/* ── Two-column content grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 215px" }}>

          {/* ════ LEFT COLUMN ════ */}
          <div style={{ padding: 16, borderRight: `1px solid ${S.border}` }}>

            {/* Main pothole image */}
            <img
              src="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&h=400&fit=crop&q=80"
              alt={`Road conditions in ${ward.name}, Ward ${ward.number}`}
              style={{ width: "100%", height: 210, objectFit: "cover", display: "block", borderRadius: 2 }}
              onError={e => { (e.target as HTMLImageElement).style.background = `linear-gradient(135deg,#1e3a5f,${S.accent})`; }}
            />

            {/* Severity badge strip */}
            <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
              {badges.map(b => (
                <span key={b.label} style={{ background: b.color, color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20, fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {b.label}
                </span>
              ))}
              <span style={{ marginLeft: "auto", fontSize: 9, color: "#4a6fa5", fontFamily: "sans-serif" }}>
                {d.trendLabel} &nbsp;|&nbsp; City avg: {cityResolutionPct}% resolved
              </span>
            </div>

            {/* Article title */}
            <div style={{ fontSize: 18, fontWeight: 700, color: S.dark, margin: "12px 0 8px", textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1.2 }}>
              TRANSFORMING BUSINESS TODAY
            </div>

            {/* Two-column article text */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <p style={{ fontSize: 11, lineHeight: 1.7, color: S.body, textAlign: "justify" }}>{d.mainArticle.col1}</p>
              <p style={{ fontSize: 11, lineHeight: 1.7, color: S.body, textAlign: "justify" }}>{d.mainArticle.col2}</p>
            </div>

            {/* Solutions */}
            <div style={{ fontSize: 13, fontWeight: 700, color: S.dark, textTransform: "uppercase", margin: "14px 0 6px", letterSpacing: 0.5 }}>
              LEADING SOLUTIONS FOR A BETTER FUTURE
            </div>
            <div style={{ fontSize: 10.5, lineHeight: 1.75, color: S.body }}>
              <strong>1. Real-Time SLA Enforcement:</strong> {d.solutions.s1}<br />
              <strong>2. AI-Driven Priority Queue:</strong> {d.solutions.s2}<br />
              <strong>3. The Frequent Flyer Programme:</strong> {d.solutions.s3}
            </div>
          </div>

          {/* ════ RIGHT SIDEBAR ════ */}
          <div style={{ background: S.dark, display: "flex", flexDirection: "column" }}>

            {/* TOP NEWS header */}
            <div style={{ background: S.accent, color: "#fff", fontSize: 15, fontWeight: 700, padding: "9px 14px", textTransform: "uppercase", letterSpacing: 1 }}>
              Top News
            </div>

            {d.topNews.map((item, i) => (
              <div key={i} style={{ padding: "10px 14px", borderBottom: `1px solid ${S.darkBdr}` }}>
                <div style={{ width: 28, height: 3, background: S.accent, marginBottom: 5 }} />
                <div style={{ fontSize: 11, fontWeight: 700, color: S.gold, marginBottom: 4, lineHeight: 1.3, fontFamily: "sans-serif" }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 10, color: S.muted, lineHeight: 1.55, fontFamily: "sans-serif" }}>
                  {item.content}
                </div>
              </div>
            ))}

            {/* Solutions sidebar header */}
            <div style={{ background: S.accent, color: "#fff", fontSize: 12, fontWeight: 700, padding: "9px 14px", textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1.2 }}>
              Leading Solutions<br />For A Better Future
            </div>
            <div style={{ padding: "10px 14px", fontSize: 10, color: S.muted, lineHeight: 1.6, fontFamily: "sans-serif", flex: 1 }}>
              <p style={{ marginBottom: 8 }}>
                <strong style={{ color: S.gold }}>Civic Tech Reporting:</strong>{" "}
                Report potholes in {ward.name} directly from the PlotHole app with GPS + photo. Each submission auto-escalates based on traffic impact score.
              </p>
              <p>
                <strong style={{ color: S.gold }}>Ward Accountability:</strong>{" "}
                {ward.engineer} · Ward {ward.number}<br />
                {ward.contact}<br />
                <span style={{ fontStyle: "italic", opacity: 0.8 }}>We are told the line is busy. We believe this.</span>
              </p>
            </div>

            {/* MLA image */}
            <img
              src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=260&fit=crop&q=80"
              alt={`MLA ${ward.mla}, ${ward.constituency}`}
              style={{ width: "100%", height: 140, objectFit: "cover", objectPosition: "center 15%", display: "block" }}
              onError={e => { (e.target as HTMLImageElement).style.background = "#1e3a5f"; }}
            />

            {/* MLA caption */}
            <div style={{ background: S.dark, color: S.muted, fontSize: 9, textAlign: "center", padding: "6px 10px 8px", fontStyle: "italic", lineHeight: 1.5, fontFamily: "sans-serif" }}>
              MLA {ward.mla}, {ward.constituency} — overseeing infrastructure development in Ward {ward.number}.
            </div>
          </div>
        </div>

        {/* Dot row */}
        <div style={{ background: S.cream, display: "flex", justifyContent: "center", gap: 4, height: 14, alignItems: "center" }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: S.accent, opacity: 0.3 }} />
          ))}
        </div>

        {/* Legend row */}
        <div style={{ display: "flex", gap: 16, padding: "8px 16px", background: S.cream, borderTop: `1px solid ${S.border}`, fontSize: 10, color: S.body, fontFamily: "sans-serif", flexWrap: "wrap", alignItems: "center" }}>
          <strong>Legend:</strong>
          {[
            { label: "Critical", color: "#dc2626" },
            { label: "High",     color: "#ea580c" },
            { label: "Medium",   color: "#d97706" },
            { label: "Low",      color: "#16a34a" },
            { label: "Repaired", color: "#10b981" },
          ].map(l => (
            <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: l.color, display: "inline-block", flexShrink: 0 }} />
              {l.label}
            </span>
          ))}
          <span style={{ marginLeft: "auto", color: "#4a6fa5" }}>Ward {ward.number} · {d.total} potholes</span>
        </div>

        {/* Footer */}
        <div style={{ background: S.accent, color: "#fff", textAlign: "center", padding: "8px 24px", fontSize: 10, fontWeight: 600, fontFamily: "sans-serif", letterSpacing: 0.3 }}>
          {d.footer}
        </div>

      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #newsletter-print, #newsletter-print * { visibility: visible !important; }
          #newsletter-print { position: fixed; inset: 0; max-width: 100%; box-shadow: none; border: none; }
        }
      `}</style>
    </div>
  );
}
