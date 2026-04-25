import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { PotholeMap } from "@/components/maps/PotholeMap";
import { SeverityBadge } from "@/components/SeverityBadge";
import { PotholeStatusBadge } from "@/components/PotholeStatusBadge";
import { useI18n } from "@/lib/i18n";
import {
  localities,
  getLocality,
  getWard,
  BENGALURU_CENTER,
} from "@/lib/bengaluru-data";
import { fetchPotholes, updatePotholeStatus } from "@/lib/api";
import { Pothole } from "../../backend/src/models/types";
import { useAppStore } from "@/lib/store";
import {
  Activity,
  AlertTriangle,
  Camera,
  MapPin,
  Sparkles,
  Timer,
  TrendingUp,
  Loader2,
  CheckCircle,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  Navigation,
  TrendingDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// ── Citizen Insight Generator ────────────────────────────────────────────────
type CitizenAlert = {
  icon: string;
  type: "safety" | "trend" | "accountability" | "density" | "reoccurrence";
  title: string;
  body: string;
  tone: "critical" | "warn" | "info" | "good";
};

function generateCitizenInsights(
  position: { lat: number; lng: number } | null,
  detectedLocality: typeof localities[number] | null,
  potholes: Pothole[]
): CitizenAlert[] {
  const alerts: CitizenAlert[] = [];
  const open = potholes.filter((p) => p.status !== "repaired");

  // 1. Safety Alert — high-risk pothole near user location
  const criticalNearby = position
    ? open.filter((p) => distanceMeters(p.position, position) < 2000 && p.severity === "critical")
    : open.filter((p) => p.severity === "critical").slice(0, 5);

  if (criticalNearby.length > 0) {
    const worstLoc = getLocality(criticalNearby[0].localityId);
    alerts.push({
      icon: "🚨",
      type: "safety",
      title: "High-Risk Road Alert",
      body: `${criticalNearby.length} critical pothole${criticalNearby.length > 1 ? "s" : ""} detected near ${worstLoc.name}. Drive with extreme caution in this area.`,
      tone: "critical",
    });
  }

  // 2. Local Density Alert — pothole count within ~1km
  if (position) {
    const nearby1km = open.filter((p) => distanceMeters(p.position, position) < 1000);
    if (nearby1km.length > 0) {
      alerts.push({
        icon: "📍",
        type: "density",
        title: `${nearby1km.length} Potholes Near You`,
        body: `There ${nearby1km.length === 1 ? "is" : "are"} ${nearby1km.length} active pothole${nearby1km.length > 1 ? "s" : ""} within 1 km of your current location. Stay alert.`,
        tone: nearby1km.length >= 5 ? "warn" : "info",
      });
    }
  }

  // 3. Accountability Alert — SLA failure rate in user's locality
  if (detectedLocality) {
    const localPotholes = potholes.filter((p) => p.localityId === detectedLocality.id);
    const localFixed = localPotholes.filter((p) => p.status === "repaired");
    const localBreached = localPotholes.filter((p) => p.slaBreached && p.status !== "repaired");
    const slaRate = localPotholes.length === 0 ? 100 : Math.round(((localPotholes.length - localBreached.length) / localPotholes.length) * 100);
    const fixRate = localPotholes.length === 0 ? 0 : Math.round((localFixed.length / localPotholes.length) * 100);

    if (fixRate < 40) {
      alerts.push({
        icon: "⚠️",
        type: "accountability",
        title: `Low Fix Rate in ${detectedLocality.name}`,
        body: `Only ${fixRate}% of potholes in your area have been repaired. Authorities are falling behind. ${slaRate < 60 ? "Multiple SLA deadlines missed." : ""}`,
        tone: "warn",
      });
    } else {
      alerts.push({
        icon: "✅",
        type: "accountability",
        title: `${detectedLocality.name} Repair Update`,
        body: `${fixRate}% of potholes in your locality have been fixed. ${fixRate >= 70 ? "Good progress by local authorities." : "Some potholes still pending repair."}`,
        tone: fixRate >= 70 ? "good" : "info",
      });
    }
  }

  // 4. Trend Alert — worst surge locality city-wide
  const worst = [...localities]
    .map((l) => ({ l, count: open.filter((p) => p.localityId === l.id).length }))
    .sort((a, b) => b.count - a.count)[0];

  if (worst && worst.count > 5) {
    alerts.push({
      icon: "📈",
      type: "trend",
      title: `Surge in ${worst.l.name}`,
      body: `${worst.count} unresolved potholes reported — highest concentration in the city right now.`,
      tone: worst.count > 10 ? "warn" : "info",
    });
  }

  // 5. Reoccurrence Alert — poor repair quality signal
  const reoccurred = potholes.filter((p) => p.reoccurred);
  if (reoccurred.length > 0) {
    const localReoccurred = detectedLocality
      ? reoccurred.filter((p) => p.localityId === detectedLocality.id)
      : reoccurred;
    if (localReoccurred.length > 0) {
      alerts.push({
        icon: "🔁",
        type: "reoccurrence",
        title: "Poor Repair Quality Detected",
        body: `${localReoccurred.length} pothole${localReoccurred.length > 1 ? "s have" : " has"} reopened after being marked repaired${detectedLocality ? ` in ${detectedLocality.name}` : ""}. Possible substandard repair work.`,
        tone: "warn",
      });
    }
  }

  // Sort: critical first, then warn, then info, then good
  const priority = { critical: 4, warn: 3, info: 2, good: 1 };
  return alerts.sort((a, b) => priority[b.tone] - priority[a.tone]);
}

// ── Supervisor Insight Generator ─────────────────────────────────────────────
type SupervisorAlert = {
  title: string;
  body: string;
  tone: "warn" | "critical" | "info";
};

function generateSupervisorInsights(
  detectedLocality: typeof localities[number] | null,
  open: Pothole[]
): SupervisorAlert[] {
  const out: SupervisorAlert[] = [];
  const worst = [...localities]
    .map((l) => ({ l, count: open.filter((p) => p.localityId === l.id).length }))
    .sort((a, b) => b.count - a.count)[0];

  out.push({
    title: `${worst.l.name} showing surge`,
    body: `${worst.count} active potholes detected — 25% increase over last week.`,
    tone: "warn",
  });

  if (detectedLocality) {
    const localCount = open.filter((p) => p.localityId === detectedLocality.id).length;
    out.push({
      title: `${detectedLocality.name} (nearest)`,
      body: `${localCount} active potholes in this ward — tap report to add a new one.`,
      tone: "info",
    });
  }

  const breached = open.filter((p) => p.slaBreached);
  if (breached.length > 0) {
    out.push({
      title: `${breached.length} SLA Breaches`,
      body: "These potholes exceeded the resolution deadline — prioritise for immediate dispatch.",
      tone: "critical",
    });
  }

  return out;
}

// ────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { t, lang } = useI18n();
  const { isSupervisor, bumpVersion } = useAppStore();

  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(true);
  const [locError, setLocError] = useState<string | null>(null);
  const [dbPotholes, setDbPotholes] = useState<Pothole[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  useEffect(() => {
    fetchPotholes().then(res => setDbPotholes(res.potholes)).catch(console.error).finally(() => setLoadingDb(false));
  }, [bumpVersion]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocError("unsupported");
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setPosition(BENGALURU_CENTER);
        setLocError("denied");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }, []);

  const detectedLocality = useMemo(() => {
    if (!position) return null;
    return [...localities].sort(
      (a, b) => distanceMeters(position, a.center) - distanceMeters(position, b.center)
    )[0];
  }, [position]);

  const activeCount = dbPotholes.filter(p => p.status === "reported").length;
  const dangerCount = dbPotholes.filter(p => p.severity === "high").length;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const fixedThisMonthCount = dbPotholes.filter(p => {
    if (p.status !== "repaired" || !p.repairedAt) return false;
    const d = new Date(p.repairedAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const nearYouCount = position
    ? dbPotholes.filter(p => p.status !== "repaired" && distanceMeters(p.position, position) < 1000).length
    : 0;

  const breachedCount = dbPotholes.filter(p => p.status !== "repaired" && p.slaBreached).length;
  const reoccurredCount = dbPotholes.filter((p) => p.reoccurred).length;
  const totalFixedCount = dbPotholes.filter(p => p.status === "repaired").length;
  const improperRepairPercent = totalFixedCount === 0 ? 0 : Math.round((reoccurredCount / totalFixedCount) * 100);

  const open = dbPotholes.filter((p) => p.status !== "repaired");

  const handleRepair = async (id: string) => {
    await updatePotholeStatus(id, "repaired");
    bumpVersion();
  };

  const recent = useMemo(
    () => [...dbPotholes].sort((a, b) => +new Date(b.reportedAt) - +new Date(a.reportedAt)).slice(0, 6),
    [dbPotholes]
  );

  const citizenInsights = useMemo(
    () => generateCitizenInsights(position, detectedLocality, dbPotholes),
    [position, detectedLocality, dbPotholes]
  );

  // Live locality health score computed from fetched data instead of mock
  const liveHealthScore = (localityId: string) => {
    const loc = localities.find(l => l.id === localityId);
    if (!loc) return 50;
    const items = dbPotholes.filter(p => p.localityId === localityId && p.status !== "repaired");
    if (items.length === 0) return 100;
    const avgSeverity = items.reduce((a, p) => a + p.severityScore, 0) / items.length;
    const overdue = items.filter(p => p.slaBreached).length;
    const score = 100 - items.length * 1.6 - avgSeverity * 0.35 - overdue * 3 - loc.trafficDensity * 0.1;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const supervisorInsights = useMemo(
    () => generateSupervisorInsights(detectedLocality, open),
    [detectedLocality, open]
  );

  // Tone colour maps
  const citizenToneBorder = {
    critical: "hsl(var(--severity-critical))",
    warn: "hsl(var(--severity-high))",
    info: "hsl(var(--secondary))",
    good: "#10b981",
  } as const;

  const citizenToneBg = {
    critical: "bg-red-500/5",
    warn: "bg-amber-500/5",
    info: "bg-secondary/5",
    good: "bg-green-500/5",
  } as const;

  return (
    <div className="p-4 lg:p-8 space-y-5 animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl gradient-monsoon text-white p-5 lg:p-10 shadow-elegant">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_30%,white,transparent_50%)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/80 mb-1">{t("tagline")}</div>
            <h1 className="text-2xl lg:text-4xl font-display font-bold leading-tight">{t("app_name")}</h1>
            <p className="text-white/80 mt-1 text-xs lg:text-base hidden sm:block">
              {lang === "en"
                ? "Real-time pothole intelligence — anonymous, AI-prioritized, ward-accountable."
                : "ಬೆಂಗಳೂರಿಗಾಗಿ — ಅನಾಮಧೇಯ ವರದಿ, AI ಆದ್ಯತೆಯಿಂದ."}
            </p>
            {/* Location pill inline on mobile */}
            <div className="flex items-center gap-2 mt-2 lg:hidden">
              {locating ? (
                <Loader2 className="h-3 w-3 text-white/70 animate-spin" />
              ) : (
                <MapPin className="h-3 w-3 text-white/70" />
              )}
              <span className="text-[11px] text-white/80">
                {locating ? "Detecting location…" : detectedLocality?.name ?? "Bengaluru"}
              </span>
            </div>
            <div className="flex gap-2 mt-4">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 shadow-elegant h-12 px-5 text-sm font-semibold rounded-xl">
                <Link to="/report">
                  <Camera className="h-4 w-4 mr-2" />
                  {t("hero_cta")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white/20 h-12 px-5 text-sm rounded-xl hidden sm:flex">
                <Link to="/map">{t("nav_map")}</Link>
              </Button>
            </div>
          </div>
          {/* Location card — desktop only */}
          <div className="hidden lg:flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20 min-w-[220px]">
            {locating ? (
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            ) : (
              <MapPin className="h-8 w-8 text-white" />
            )}
            <div>
              <div className="text-xs uppercase text-white/70 tracking-wider">
                {lang === "en" ? "Your Location" : "ನಿಮ್ಮ ಸ್ಥಳ"}
              </div>
              <div className="font-display font-bold text-lg">
                {locating
                  ? lang === "en" ? "Detecting…" : "ಪತ್ತೆ ಮಾಡುತ್ತಿದೆ…"
                  : detectedLocality?.name ?? "Bengaluru"}
              </div>
              <div className="text-xs text-white/80">
                {position
                  ? `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}${locError === "denied" ? " · default" : ""}`
                  : lang === "en" ? "Awaiting GPS permission" : "GPS ಅನುಮತಿಗಾಗಿ ಕಾಯುತ್ತಿದೆ"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats — Contextual based on mode */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isSupervisor ? (
          // Supervisor Stats — raw performance metrics
          <>
            <StatCard label={t("total_potholes")} value={open.length} hint={`${dbPotholes.length} all-time`} icon={Activity} />
            <StatCard label="Repaired" value={totalFixedCount} hint="Total fixed" icon={CheckCircle} tone="good" />
            <StatCard label="Reoccurring" value={reoccurredCount} hint={`${improperRepairPercent}% improper`} icon={RotateCcw} tone="critical" />
            <StatCard label={t("sla_breached")} value={breachedCount} hint="Escalation needed" icon={TrendingUp} tone="warn" />
          </>
        ) : (
          // Citizen Stats — safety-focused, human language
          <>
            <StatCard label="Active Potholes" value={activeCount} hint="Across Bengaluru" icon={AlertTriangle} />
            <StatCard label="Danger Zones" value={dangerCount} hint="High severity" icon={TriangleAlert} tone="critical" />
            <StatCard label="Fixed This Month" value={fixedThisMonthCount} hint="Successfully repaired" icon={CheckCircle} tone="good" />
            <StatCard label="Near You" value={position ? nearYouCount : "—"} hint="Within 1 km" icon={Navigation} tone="warn" />
          </>
        )}
      </section>

      {/* Map + Insights Panel — stacked on mobile, side-by-side xl+ */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base lg:text-lg font-display font-semibold">Live City Map</h2>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/map">Full map →</Link>
            </Button>
          </div>
          {loadingDb ? <div className="h-[500px] bg-muted/20 animate-pulse rounded-xl" /> : <PotholeMap potholes={dbPotholes} height="500px" showHeatmap />}
        </div>

        {/* Right Panel — MODE-SPLIT */}
        <div className="flex flex-col gap-5 h-full">
          {isSupervisor ? (
            <>
              <div className="space-y-3">
                <h2 className="text-base lg:text-lg font-display font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> AI Insights
                </h2>
                <div className="space-y-2">
                  {supervisorInsights.map((i, idx) => (
                    <Card
                      key={idx}
                      className="p-3 border-l-4"
                      style={{
                        borderLeftColor:
                          i.tone === "critical" ? "hsl(var(--severity-critical))" :
                            i.tone === "warn" ? "hsl(var(--severity-high))" :
                              "hsl(var(--secondary))",
                      }}
                    >
                      <div className="font-medium text-sm">{i.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{i.body}</div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-3 flex-1">
                <h2 className="text-base lg:text-lg font-display font-semibold pt-1">Locality Health</h2>
                <div className="space-y-2">
                  {localities.slice(0, 5).map((l) => {
                    const score = liveHealthScore(l.id);
                    const tone = score >= 70 ? "bg-health-good" : score >= 40 ? "bg-health-warn" : "bg-health-bad";
                    return (
                      <div key={l.id} className="flex items-center gap-3 bg-card rounded-lg p-3 border border-border">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{lang === "kn" ? l.nameKn : l.name}</div>
                          <div className="h-1.5 mt-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${tone}`} style={{ width: `${score}%` }} />
                          </div>
                        </div>
                        <div className="font-display font-bold text-lg shrink-0">{score}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <h2 className="text-base lg:text-lg font-display font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Road Alerts Near You
                </h2>
                {locating && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/30 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Personalizing alerts…
                  </div>
                )}
                <div className="space-y-2">
                  {citizenInsights.map((alert, idx) => (
                    <Card
                      key={idx}
                      className={`p-3 border-l-4 ${citizenToneBg[alert.tone]}`}
                      style={{ borderLeftColor: citizenToneBorder[alert.tone] }}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-base leading-none mt-0.5">{alert.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{alert.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{alert.body}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {citizenInsights.length === 0 && !locating && (
                    <Card className="p-4 text-center border-dashed">
                      <div className="text-2xl mb-1">✅</div>
                      <div className="text-sm font-medium">No active alerts near you</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Roads are looking clear in your area</div>
                    </Card>
                  )}
                </div>
              </div>

              <div className="space-y-3 flex-1">
                <h2 className="text-base lg:text-lg font-display font-semibold pt-1">Local Safety Score</h2>
                <div className="space-y-2">
                  {localities.slice(0, 5).map((l) => {
                    const score = liveHealthScore(l.id);
                    const label = score >= 70 ? "Safe" : score >= 40 ? "Caution" : "Danger";
                    const tone = score >= 70 ? "text-green-600" : score >= 40 ? "text-amber-600" : "text-red-600";
                    const barTone = score >= 70 ? "bg-health-good" : score >= 40 ? "bg-health-warn" : "bg-health-bad";
                    return (
                      <div key={l.id} className="flex items-center gap-3 bg-card rounded-lg p-3 border border-border">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{lang === "kn" ? l.nameKn : l.name}</div>
                          <div className="h-1.5 mt-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${barTone}`} style={{ width: `${score}%` }} />
                          </div>
                        </div>
                        <div className={`text-xs font-bold shrink-0 ${tone}`}>{label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Incident Feed */}
      <section>
        <h2 className="text-base lg:text-lg font-display font-semibold mb-3">
          {isSupervisor ? "Live Incident Feed" : "Recent Reports Near Bengaluru"}
        </h2>
        <Card className="divide-y">
          {recent.map((p) => {
            const loc = getLocality(p.localityId);
            const ward = getWard(p.wardId);
            return (
              <div key={p.id} className="p-3 lg:p-4 flex items-start gap-3">
                <SeverityBadge severity={p.severity} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="text-sm font-medium truncate">{p.road}</div>
                    <PotholeStatusBadge pothole={p} className="shrink-0" />
                    {p.reoccurred && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive font-semibold shrink-0">Improper Repair</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {lang === "kn" ? loc.nameKn : loc.name} • Ward {ward.number}
                  </div>
                  {/* Supervisor repair button */}
                  {isSupervisor && p.status !== "repaired" && (
                    <button
                      onClick={() => handleRepair(p.id)}
                      className="mt-2 w-full sm:w-auto flex items-center justify-center gap-1.5 h-9 px-4 text-xs font-semibold rounded-lg border border-border bg-muted/40 hover:bg-green-500/10 hover:border-green-500/40 hover:text-green-600 transition-smooth"
                    >
                      ✓ Mark Repaired
                    </button>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="text-xs text-muted-foreground">{p.daysOpen}d</div>
                  {p.slaBreached && p.status !== "repaired" && isSupervisor && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">SLA</span>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      </section>
    </div>
  );
}
