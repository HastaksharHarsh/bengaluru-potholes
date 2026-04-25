import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { useVoiceRecognition } from "@/hooks/use-voice";
import { reportPothole, fetchNearbyPotholes } from "@/lib/api";
import { BENGALURU_CENTER, localities, Severity, SizeBucket, PotholeStatus } from "@/lib/bengaluru-data";
import { Pothole } from "../../backend/src/models/types";
import { toast } from "sonner";
import {
  Camera,
  Check,
  ChevronLeft,
  Loader2,
  MapPin,
  Mic,
  RefreshCw,
  Sparkles,
  Square,
  Upload,
  ShieldOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SeverityBadge } from "@/components/SeverityBadge";
import { useAppStore } from "@/lib/store";

export type YOLOAIResult = {
  severity: Severity;
  score: number;
  reasons: string[];
  detections: any[];
  image_size?: { width: number; height: number };
};

type Step = "capture" | "size" | "voice" | "review" | "success";

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function nearestLocality(pos: { lat: number; lng: number }) {
  return [...localities].sort((a, b) => distanceMeters(pos, a.center) - distanceMeters(pos, b.center))[0];
}

// Model fetch happens dynamically, so we will remove the synchronous `aiSeverity` function
// and handle ML prediction via fetch in the component.

const SIZE_META: Record<SizeBucket, { emoji: string; desc: string; descKn: string; color: string }> = {
  small: { emoji: "🔵", desc: "< 30 cm — Minor hazard", descKn: "30 ಸೆಂ.ಮೀ ಗಿಂತ ಕಡಿಮೆ", color: "border-blue-400 bg-blue-50 dark:bg-blue-950/30" },
  medium: { emoji: "🟠", desc: "30–60 cm — Moderate damage", descKn: "30–60 ಸೆಂ.ಮೀ", color: "border-orange-400 bg-orange-50 dark:bg-orange-950/30" },
  large: { emoji: "🔴", desc: "> 60 cm — Serious hazard", descKn: "60 ಸೆಂ.ಮೀ ಮೇಲೆ — ಅಪಾಯ", color: "border-red-400 bg-red-50 dark:bg-red-950/30" },
};

export default function ReportPothole() {
  const { t, lang } = useI18n();
  const [step, setStep] = useState<Step>("capture");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [size, setSize] = useState<SizeBucket | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [yoloResult, setYoloResult] = useState<any | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { saveReport } = useAppStore();

  const [nearbyPotholes, setNearbyPotholes] = useState<Pothole[]>([]);

  const voice = useVoiceRecognition(lang);

  useEffect(() => {
    const handleLocationError = (err?: GeolocationPositionError) => {
      console.warn("Geolocation error:", err);
      toast.warning("Location access denied or failed. Please allow location permissions in your browser to accurately tag the pothole. Defaulting to city center.");
      setPosition(BENGALURU_CENTER);
    };

    if (!navigator.geolocation) {
      handleLocationError();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      handleLocationError,
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  useEffect(() => {
    if (position) {
      fetchNearbyPotholes(position.lat, position.lng, 15).then(setNearbyPotholes).catch(console.error);
    }
  }, [position]);

  useEffect(() => {
    // Auto-open camera on mobile
    if (step === "capture" && !photo && fileRef.current) {
      const t = setTimeout(() => {
        try { fileRef.current?.click(); } catch (e) { }
      }, 100);
      return () => clearTimeout(t);
    }
  }, [step, photo]);

  const handleFile = async (file: File) => {
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhoto(e.target?.result as string);
    reader.readAsDataURL(file);

    // Automatically trigger YOLO model inference
    if (file) {
      setAnalyzingImage(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("http://localhost:8000/detect", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const mlData = await res.json();
          let image_size = mlData.image_size;
          setYoloResult({ detections: mlData.detections, image_size, count: mlData.pothole_count });
        } else {
          toast.error("Model analysis failed. Is the Python server running?");
        }
      } catch (e) {
        console.error(e);
        toast.error("Could not reach model server (localhost:8000). Ensure it is running.");
      } finally {
        setAnalyzingImage(false);
      }
    }
  };

  const nearby = nearbyPotholes.filter((p) => p.status !== "repaired");
  const isDuplicate = nearby.length > 0;
  const detectedLocality = position ? nearestLocality(position) : null;
  const repairedNearby = nearbyPotholes.filter((p) => p.status === "repaired");
  const isReoccurrence = repairedNearby.length > 0;

  // Dynamically calculate priority AI
  let ai: YOLOAIResult | null = null;
  if (position && (size || yoloResult)) {
    let reasons: string[] = [];
    let score = 0;
    let severity: Severity = "low";

    let userScore = size === "large" ? 85 : size === "medium" ? 65 : 45;
    let mlScore = 0;

    if (yoloResult && yoloResult.detections?.length > 0) {
      const best = yoloResult.detections[0];
      const mlSev = best.severity || "minor_pothole";

      let sevSevValue = best.severity_score || 0;
      if (sevSevValue >= 0.05) {
        mlScore = 80 + Math.min(20, ((sevSevValue - 0.05) / 0.15) * 20);
      } else if (sevSevValue >= 0.015) {
        mlScore = 60 + ((sevSevValue - 0.015) / 0.035) * 19;
      } else if (sevSevValue > 0) {
        mlScore = 40 + (sevSevValue / 0.015) * 19;
      }

      reasons.push(`AI Analysis (${mlSev.replace('_', ' ')})`);
      reasons.push(`AI Confidence: ${(best.confidence * 100).toFixed(1)}%`);
    }

    if (mlScore > 0 && userScore > 0) {
      score = Math.round((mlScore + userScore) / 2);
      reasons.push(`Normalized severity blending AI and User Input (${size})`);
    } else if (mlScore > 0) {
      score = Math.round(mlScore);
    } else {
      score = userScore;
      reasons.push(`Manual Size Selection: ${size}`);
    }

    severity = score >= 80 ? "critical" : score >= 60 ? "high" : "medium";

    ai = { severity, score, reasons, detections: yoloResult?.detections || [], image_size: yoloResult?.image_size };
  }

  const submit = () => {
    setSubmitting(true);
    setTimeout(async () => {
      if (position && ai && detectedLocality) {
        const generatedId = `ph-${Date.now()}`;

        // Normalize size representation against the final cross-checked AI severity
        const normalizedSize: SizeBucket = ai.severity === "critical" ? "large" : ai.severity === "high" ? "medium" : "small";

        try {
          const res = await reportPothole({
            lat: position.lat,
            lng: position.lng,
            size: normalizedSize,
            voiceNote: voice.transcript,
            image: photoFile || undefined,
            severity: ai.severity,
            severityScore: ai.score,
          });

          if (res.duplicate) {
             toast.info(`Report logged! This pothole was already reported. It has now been upvoted ${res.upvotes} times and severity increased to ${res.severityScore}.`);
          } else {
             toast.success("Pothole reported successfully!");
          }

        } catch (e) {
          console.error("Failed to submit to backend", e);
          toast.error("Failed to report pothole to cloud, checking backend connectivity.");
          setSubmitting(false);
          return;
        }

        // Save the comprehensive JSON report format to store
        saveReport({
          potholeId: generatedId,
          timestamp: new Date().toISOString(),
          location: position,
          localityDetails: detectedLocality,
          yoloModelResults: ai,
          userInputs: { size, voiceNote: voice.transcript },
          duplicateStatus: isDuplicate,
          improperRepairFlags: isReoccurrence
        });
      }

      setSubmitting(false);
      setStep("success");
    }, 1100);
  };

  const steps: { key: Step; label: string }[] = [
    { key: "capture", label: "Photo" },
    { key: "size", label: "Size" },
    { key: "voice", label: "Voice" },
    { key: "review", label: "Submit" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2 lg:px-8 lg:pt-8">
        {/* Anonymity Banner */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 mb-4">
          <ShieldOff className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-xs text-green-700 dark:text-green-400 font-medium">
            {lang === "en"
              ? "No login required · 100% Anonymous · No personal data collected"
              : "ಲಾಗಿನ್ ಅಗತ್ಯವಿಲ್ಲ · 100% ಅನಾಮಧೇಯ · ಯಾವುದೇ ಖಾಸಗಿ ಮಾಹಿತಿ ಇಲ್ಲ"}
          </p>
        </div>

        <h1 className="text-xl font-display font-bold">{t("nav_report")}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {lang === "en" ? "4 quick steps · Takes under 60 seconds" : "4 ಸರಳ ಹಂತಗಳು · 60 ಸೆಕೆಂಡ್‌ಗಿಂತ ಕಡಿಮೆ"}
        </p>
      </div>

      {/* ── Step Progress Bar (Hide on Success) ──────────────── */}
      {step !== "success" && (
        <div className="px-4 lg:px-8 py-3">
          <div className="flex items-center gap-0">
            {steps.map((s, idx) => (
              <div key={s.key} className="flex-1 flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                      idx < currentIdx
                        ? "bg-primary text-white"
                        : idx === currentIdx
                          ? "gradient-hero text-white shadow-md ring-2 ring-primary/30"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {idx < currentIdx ? <Check className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span className={cn("text-[9px] font-medium uppercase tracking-wider hidden sm:block", idx === currentIdx ? "text-primary" : "text-muted-foreground")}>
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={cn("flex-1 h-0.5 mx-1.5 rounded-full", idx < currentIdx ? "bg-primary" : "bg-muted")} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step Content ─────────────────────────────────────── */}
      <div className="flex-1 px-4 pb-4 lg:px-8 lg:pb-8 max-w-2xl w-full mx-auto">

        {/* ── STEP 1: CAPTURE ── */}
        {step === "capture" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-lg font-display font-semibold">Take a Photo</h2>
              <p className="text-sm text-muted-foreground">Point at the pothole clearly</p>
            </div>

            {photo ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-primary/30 shadow-md">
                <img src={photo} alt="Pothole" className="w-full h-64 object-cover" />
                <button
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 text-white rounded-full text-xs font-medium backdrop-blur-sm"
                  onClick={() => setPhoto(null)}
                >
                  <RefreshCw className="h-3 w-3" /> Retake
                </button>
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-green-500/90 text-white rounded-full text-xs font-semibold">
                  <Check className="h-3 w-3" /> Photo captured
                </div>
              </div>
            ) : (
              <button
                className="w-full min-h-[220px] border-2 border-dashed border-primary/30 rounded-2xl flex flex-col items-center justify-center gap-4 bg-muted/20 hover:bg-muted/40 hover:border-primary/60 active:scale-[0.98] transition-all cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                <div className="h-20 w-20 rounded-2xl gradient-hero flex items-center justify-center shadow-lg">
                  <Camera className="h-10 w-10 text-white" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-foreground">Open Camera</div>
                  <div className="text-xs text-muted-foreground mt-1">Tap anywhere to take / upload photo</div>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </button>
            )}

            {/* Location pill */}
            {position && detectedLocality && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary/10 border border-secondary/20">
                <MapPin className="h-4 w-4 text-secondary shrink-0" />
                <div className="text-sm">
                  <span className="font-medium">{lang === "kn" ? detectedLocality.nameKn : detectedLocality.name}</span>
                  <span className="text-muted-foreground text-xs ml-1.5">
                    {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
                  </span>
                </div>
              </div>
            )}

            <Button
              disabled={!photo || analyzingImage}
              onClick={() => setStep("size")}
              size="lg"
              className="w-full h-14 text-base font-semibold rounded-2xl"
            >
              {analyzingImage ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing Model...</> : "Continue →"}
            </Button>
          </div>
        )}

        {/* ── STEP 2: SIZE ── */}
        {step === "size" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-lg font-display font-semibold">How big is the pothole?</h2>
              <p className="text-sm text-muted-foreground">This determines repair priority</p>
            </div>

            <div className="grid gap-3">
              {(["small", "medium", "large"] as SizeBucket[]).map((s) => {
                const meta = SIZE_META[s];
                const isSelected = size === s;
                return (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border-2 transition-all active:scale-[0.98] min-h-[72px]",
                      isSelected
                        ? `${meta.color} border-current shadow-md`
                        : "border-border bg-card hover:border-muted-foreground/30"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{meta.emoji}</span>
                      <div className="flex-1">
                        <div className="font-semibold capitalize text-base">{s}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {lang === "kn" ? meta.descKn : meta.desc}
                        </div>
                      </div>
                      <div className={cn(
                        "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected ? "border-current bg-current" : "border-muted"
                      )}>
                        {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("capture")} className="h-14 px-6 rounded-2xl">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                disabled={!size}
                onClick={() => setStep("voice")}
                size="lg"
                className="flex-1 h-14 text-base font-semibold rounded-2xl"
              >
                Continue →
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: VOICE ── */}
        {step === "voice" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-display font-semibold">Describe the Issue</h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Optional</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {lang === "en" ? "Speak in English or Kannada" : "ಮೈಕ್ ಒತ್ತಿ ಗುಂಡಿಯನ್ನು ವಿವರಿಸಿ"}
              </p>
            </div>

            {/* Large Mic Button */}
            <div className="flex flex-col items-center gap-5 py-8">
              <button
                onClick={voice.listening ? voice.stop : voice.start}
                disabled={!voice.supported}
                className={cn(
                  "h-32 w-32 rounded-full flex items-center justify-center text-white shadow-xl transition-all active:scale-95",
                  voice.listening
                    ? "bg-destructive animate-pulse"
                    : "gradient-hero hover:scale-105",
                  !voice.supported && "opacity-40 cursor-not-allowed"
                )}
              >
                {voice.listening ? <Square className="h-12 w-12" /> : <Mic className="h-14 w-14" />}
              </button>

              <div className="text-center">
                <div className="font-semibold text-sm">
                  {voice.listening
                    ? "🔴 Recording — tap to stop"
                    : voice.transcript
                      ? "✓ Recorded — tap to re-record"
                      : "Tap mic to describe"}
                </div>
                {!voice.supported && (
                  <div className="text-xs text-destructive mt-1">Browser doesn't support speech. Try Chrome.</div>
                )}
                {voice.error && <div className="text-xs text-destructive mt-1">{voice.error}</div>}
              </div>

              {voice.transcript && (
                <div className="w-full p-4 rounded-2xl bg-muted/50 border border-muted">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Your note</div>
                  <div className="text-sm">{voice.transcript}</div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("size")} className="h-14 px-6 rounded-2xl">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setStep("review")}
                size="lg"
                className="flex-1 h-14 text-base font-semibold rounded-2xl"
              >
                {voice.transcript ? "Continue →" : "Skip →"}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: REVIEW ── */}
        {step === "review" && ai && position && detectedLocality && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-lg font-display font-semibold">Review & Submit</h2>
              <p className="text-sm text-muted-foreground">Confirm your report before sending</p>
            </div>

            {/* Photo Thumbnail */}
            {photo && (
              <div className="relative rounded-2xl overflow-hidden border border-border h-40">
                <img src={photo} alt="Pothole" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                {yoloResult?.image_size && yoloResult.detections.map((det: any, i: number) => (
                  <svg
                    key={i}
                    className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-md"
                    viewBox={`0 0 ${yoloResult.image_size!.width} ${yoloResult.image_size!.height}`}
                    preserveAspectRatio="xMidYMid slice"
                  >
                    <rect
                      x={det.bbox.x1}
                      y={det.bbox.y1}
                      width={det.bbox.x2 - det.bbox.x1}
                      height={det.bbox.y2 - det.bbox.y1}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={Math.max(4, yoloResult.image_size!.width / 200)}
                      rx="8"
                    />
                    <text
                      x={det.bbox.x1 + 4}
                      y={Math.max(20, det.bbox.y1 - 10)}
                      fill="#ef4444"
                      fontSize={Math.max(16, yoloResult.image_size!.width / 25)}
                      fontWeight="bold"
                      style={{ textShadow: "0px 1px 3px rgba(0,0,0,0.8)" }}
                    >
                      {Math.round(det.confidence * 100)}%
                    </text>
                  </svg>
                ))}
              </div>
            )}

            {/* AI Result Card */}
            <Card className="p-4 bg-gradient-to-br from-primary/5 to-card border-primary/20">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary font-semibold mb-3">
                <Sparkles className="h-3.5 w-3.5" /> AI Priority Analysis
              </div>
              <div className="flex items-center gap-4">
                <SeverityBadge severity={ai.severity} className="text-sm py-1.5 px-4" />
                <div className="font-display font-bold text-3xl">
                  {ai.score}<span className="text-sm font-normal text-muted-foreground">/100</span>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {ai.reasons.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    {r}
                  </div>
                ))}
              </div>
            </Card>

            {/* Reoccurrence Warning */}
            {isReoccurrence && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/30">
                <span className="text-lg">⚠️</span>
                <div>
                  <div className="font-semibold text-sm text-destructive">Improper Repair Detected</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    This location was previously repaired but the pothole has returned. This will be flagged for supervisor review.
                  </div>
                </div>
              </div>
            )}

            {isDuplicate && !isReoccurrence && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-300/50">
                <span className="text-lg">ℹ️</span>
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  A similar report exists nearby — your submission will upvote it.
                </div>
              </div>
            )}

            {/* Summary Grid */}
            <div className={`grid ${voice.transcript ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Location</div>
                <div className="font-semibold text-sm mt-1 truncate">
                  {lang === "kn" ? detectedLocality.nameKn : detectedLocality.name}
                </div>
              </div>
              {voice.transcript && (
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Voice Note</div>
                  <div className="text-sm mt-1 line-clamp-2">{voice.transcript}</div>
                </div>
              )}
            </div>

            {/* Anonymity Reminder */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
              <span className="text-sm">🔒</span>
              <span className="text-xs text-green-700 dark:text-green-400">
                Your identity is never stored — this report is 100% anonymous
              </span>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("voice")} className="h-14 px-6 rounded-2xl">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={submit}
                disabled={submitting}
                size="lg"
                className="flex-1 h-14 text-base font-bold rounded-2xl gradient-hero text-white shadow-elegant"
              >
                {submitting ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Submitting…</>
                ) : (
                  <><Upload className="h-5 w-5 mr-2" /> Submit Report</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 5: SUCCESS ── */}
        {step === "success" && (
          <div className="space-y-6 animate-fade-in flex flex-col items-center justify-center text-center py-8">
            <div className="h-24 w-24 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
              <div className="h-16 w-16 rounded-full gradient-hero flex items-center justify-center shadow-lg shadow-green-500/20 text-white">
                <Check className="h-8 w-8" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-display font-bold text-foreground">Report Submitted</h2>
              <p className="text-muted-foreground mt-2 max-w-[280px] mx-auto">
                Your report helps improve road safety in your area. Thank you!
              </p>
            </div>

            <Card className="p-4 w-full bg-primary/5 border-primary/20">
              <div className="flex items-start gap-3">
                <span className="text-xl">
                  {ai?.severity === "critical" ? "⚠️" : "📈"}
                </span>
                <div className="text-left">
                  <div className="font-bold text-sm">
                    {ai?.severity === "critical" ? "Area now marked critical" : "Priority increased"}
                  </div>
                  {isDuplicate && (
                    <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
                      You added to an existing cluster — increasing urgency.
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <div className="w-full space-y-3 mt-4">
              <Button asChild size="lg" className="w-full h-14 rounded-2xl text-base font-bold shadow-elegant">
                <Link to="/">Back to Dashboard</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full h-14 rounded-2xl text-base font-bold bg-transparent"
                onClick={() => {
                  setStep("capture");
                  setPhoto(null);
                  setSize(null);
                  voice.setTranscript("");
                }}
              >
                Report Another
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
