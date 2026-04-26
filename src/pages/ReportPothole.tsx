import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useVoiceRecognition } from "@/hooks/use-voice";
import { reportPothole, fetchNearbyPotholes } from "@/lib/api";
import { BENGALURU_CENTER, localities, Severity, SizeBucket } from "@/lib/bengaluru-data";
import { Pothole } from "../../backend/src/models/types";
import { toast } from "sonner";
import {
  Camera,
  Check,
  ChevronLeft,
  Loader2,
  MapPin,
  Mic,
  Sparkles,
  Upload,
  X,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function nearestLocality(pos: { lat: number; lng: number }) {
  return [...localities].sort((a, b) => distanceMeters(pos, a.center) - distanceMeters(pos, b.center))[0];
}

const SIZE_META: Record<SizeBucket, { emoji: string; desc: string; descKn: string }> = {
  small: { emoji: "🔵", desc: "< 30 cm — Minor hazard", descKn: "30 ಸೆಂ.ಮೀ ಗಿಂತ ಕಡಿಮೆ" },
  medium: { emoji: "🟠", desc: "30–60 cm — Moderate damage", descKn: "30–60 ಸೆಂ.ಮೀ" },
  large: { emoji: "🔴", desc: "> 60 cm — Serious hazard", descKn: "60 ಸೆಂ.ಮೀ ಮೇಲೆ — ಅಪಾಯ" },
};

export default function ReportPothole() {
  const { lang } = useI18n();
  const [step, setStep] = useState<Step>("capture");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [size, setSize] = useState<SizeBucket | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [yoloResult, setYoloResult] = useState<any | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { saveReport, bumpVersion } = useAppStore();

  const [nearbyPotholes, setNearbyPotholes] = useState<Pothole[]>([]);
  const voice = useVoiceRecognition(lang);

  useEffect(() => {
    const handleLocationError = () => {
      toast.warning("Location access denied. Tagging at city center.");
      setPosition(BENGALURU_CENTER);
    };

    if (!navigator.geolocation) {
      handleLocationError();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      handleLocationError,
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  useEffect(() => {
    if (position) {
      fetchNearbyPotholes(position.lat, position.lng, 15).then(setNearbyPotholes).catch(console.error);
    }
  }, [position]);

  const handleFile = async (file: File) => {
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhoto(e.target?.result as string);
    reader.readAsDataURL(file);

    if (file) {
      setAnalyzingImage(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("http://localhost:8000/detect", { method: "POST", body: formData });
        if (res.ok) {
          const mlData = await res.json();
          setYoloResult({ detections: mlData.detections, image_size: mlData.image_size, count: mlData.pothole_count });
        }
      } catch (e) {
        console.warn("AI Analysis server not available", e);
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

  let ai: YOLOAIResult | null = null;
  if (position && (size || yoloResult)) {
    let reasons: string[] = [];
    let score = size === "large" ? 85 : size === "medium" ? 65 : 45;
    if (yoloResult?.detections?.length > 0) {
      reasons.push(`AI Analysis detected ${yoloResult.count} hazard(s)`);
      score = Math.min(100, score + 10);
    }
    reasons.push(`User input: ${size}`);
    const severity = score >= 80 ? "critical" : score >= 60 ? "high" : "medium";
    ai = { severity, score, reasons, detections: yoloResult?.detections || [], image_size: yoloResult?.image_size };
  }

  const submit = () => {
    setSubmitting(true);
    setTimeout(async () => {
      if (position && ai && detectedLocality) {
        const generatedId = `ph-${Date.now()}`;
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
          if (res.duplicate) toast.info("Report logged as duplicate cluster upvote.");
          else toast.success("Pothole reported successfully!");
        } catch (e) {
          toast.error("Connectivity issue — report cached locally.");
        }

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
        bumpVersion();
      }
      setSubmitting(false);
      setStep("success");
    }, 1100);
  };

  const steps: { key: Step; label: string }[] = [
    { key: "capture", label: "Photo" },
    { key: "size", label: "AI Analysis" },
    { key: "voice", label: "Voice" },
    { key: "review", label: "Submit" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-surface-page flex flex-col pb-[120px] lg:pb-[24px]">
      
      {/* ── Page Header ── */}
      <div className="bg-surface-card border-b border-default-g px-[24px] py-[24px]">
        <div className="max-w-[600px] mx-auto space-y-[16px]">
          <div>
            <h1 className="text-h1">Report Hazard</h1>
            <p className="text-body text-secondary-g">Help make Bengaluru's roads safer in 60 seconds.</p>
          </div>

          {/* Step Indicator */}
          {step !== "success" && (
            <div className="flex items-center w-full max-w-[300px]">
              {steps.map((s, idx) => {
                const isActive = idx === currentIdx;
                const isComplete = idx < currentIdx;
                
                return (
                  <div key={s.key} className="flex items-center flex-1 last:flex-none">
                    <div className={cn(
                      "flex items-center justify-center rounded-full z-10 transition-colors",
                      isActive ? "h-[10px] w-[10px] bg-[var(--g-blue)] ring-4 ring-surface-active" : 
                      isComplete ? "h-[16px] w-[16px] bg-[var(--g-green)]" : 
                      "h-[10px] w-[10px] border-2 border-[#dadce0] bg-white"
                    )}>
                      {isComplete && <Check className="h-[10px] w-[10px] text-white" strokeWidth={3} />}
                    </div>
                    {idx < steps.length - 1 && (
                      <div className={cn(
                        "flex-1 h-[2px] mx-[4px]",
                        isComplete ? "bg-[var(--g-green)]" : "bg-[#dadce0]"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-[600px] w-full mx-auto p-[24px] space-y-[24px]">
        
        {/* ── STEP 1: CAPTURE ── */}
        {step === "capture" && (
          <div className="space-y-[24px] animate-fade-in">
            <div className="relative">
              {photo ? (
                <div className="relative rounded-[16px] overflow-hidden shadow-card-g border border-default-g h-[300px] bg-black">
                  <img src={photo} alt="Pothole" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setPhoto(null)}
                    className="absolute top-[16px] right-[16px] h-[32px] w-[32px] bg-[rgba(0,0,0,0.5)] rounded-full flex items-center justify-center text-white hover:bg-[rgba(0,0,0,0.7)] transition-colors"
                  >
                    <X className="h-[16px] w-[16px]" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-[200px] rounded-[16px] border-2 border-dashed border-[#dadce0] bg-surface-card hover:border-[var(--g-blue)] transition-colors flex flex-col items-center justify-center gap-[12px]"
                >
                  <Camera className="h-[48px] w-[48px] text-[var(--g-blue)]" />
                  <div className="text-center">
                    <div className="text-h3 text-primary-g">Tap to photograph pothole</div>
                    <div className="text-body text-secondary-g mt-[4px]">or select from gallery</div>
                  </div>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>

            {position && detectedLocality && (
              <div className="flex items-center gap-[12px] p-[16px] bg-surface-card rounded-[12px] border border-default-g shadow-card-g">
                <Target className="h-[20px] w-[20px] text-[var(--g-blue)]" />
                <div>
                  <div className="text-label text-primary-g">{detectedLocality.name}</div>
                  <div className="text-hint text-secondary-g">Auto-geotagged from GPS</div>
                </div>
              </div>
            )}

            <button 
              disabled={!photo || analyzingImage}
              onClick={() => setStep("size")}
              className="w-full h-[52px] rounded-[12px] bg-[var(--g-blue)] text-white text-h3 active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {analyzingImage ? <><Loader2 className="h-[20px] w-[20px] animate-spin" /> Analyzing...</> : "Continue"}
            </button>
          </div>
        )}

        {/* ── STEP 2: AI ANALYSIS / SIZE ── */}
        {step === "size" && (
          <div className="space-y-[24px] animate-fade-in">
            {yoloResult?.count > 0 ? (
              <div className="bg-surface-card border-l-[4px] border-l-[var(--g-green)] border-y border-r border-default-g shadow-card-g rounded-r-[12px] p-[16px]">
                <div className="g-chip bg-[#e6f4ea] text-[#137333] mb-[16px]">
                  <Sparkles className="h-[12px] w-[12px] mr-1" /> AI Analysis Complete
                </div>
                <div className="flex items-end gap-[12px]">
                  <div className="text-[36px] font-[700] text-[var(--g-red)] leading-none">{yoloResult.count}</div>
                  <div className="text-h3 text-primary-g mb-1">Hazard(s) Detected</div>
                </div>
              </div>
            ) : null}

            <div>
              <h3 className="text-h2 text-primary-g mb-[4px]">Confirm Size</h3>
              <p className="text-body text-secondary-g mb-[16px]">Helps prioritize resources for repair.</p>
              
              <div className="grid gap-[12px]">
                {(["small", "medium", "large"] as SizeBucket[]).map((s) => {
                  const meta = SIZE_META[s];
                  const active = size === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={cn(
                        "w-full p-[16px] rounded-[12px] border transition-all flex items-center gap-[16px] text-left",
                        active ? "border-[var(--g-blue)] bg-surface-active" : "bg-surface-card border-default-g hover:bg-surface-muted"
                      )}
                    >
                      <span className="text-[24px]">{meta.emoji}</span>
                      <div className="flex-1">
                        <div className="text-h3 capitalize text-primary-g">{s}</div>
                        <div className="text-body text-secondary-g">{meta.desc}</div>
                      </div>
                      <div className={cn("h-[20px] w-[20px] rounded-full border-2 flex items-center justify-center", active ? "border-[var(--g-blue)] bg-[var(--g-blue)]" : "border-[#dadce0]")}>
                        {active && <Check className="h-[12px] w-[12px] text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-[12px]">
              <button onClick={() => setStep("capture")} className="h-[52px] px-[24px] rounded-[12px] border border-default-g bg-surface-card hover:bg-surface-muted transition-colors">
                <ChevronLeft className="h-[20px] w-[20px] text-secondary-g" />
              </button>
              <button 
                disabled={!size} 
                onClick={() => setStep("voice")} 
                className="flex-1 h-[52px] rounded-[12px] bg-[var(--g-blue)] text-white text-h3 disabled:opacity-50 active:scale-[0.97] transition-transform"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: VOICE ── */}
        {step === "voice" && (
          <div className="space-y-[32px] animate-fade-in py-[24px] flex flex-col items-center">
            <div className="text-center">
              <h3 className="text-h2 text-primary-g">Add Context</h3>
              <p className="text-body text-secondary-g mt-[4px]">Describe landmarks or hazards.</p>
            </div>
            
            <button 
              onClick={voice.listening ? voice.stop : voice.start}
              className={cn(
                "h-[64px] w-[64px] rounded-[50%] flex items-center justify-center text-white shadow-lift-g transition-all duration-300",
                voice.listening ? "bg-[var(--g-red)] scale-110 shadow-[0_0_0_12px_rgba(234,67,53,0.2)]" : "bg-[var(--g-blue)] hover:scale-105"
              )}
            >
              <Mic className="h-[32px] w-[32px]" />
            </button>

            <div className="flex gap-2">
              <span className="g-chip bg-surface-active text-[var(--g-blue)]">English</span>
              <span className="g-chip bg-surface-muted text-secondary-g">ಕನ್ನಡ</span>
            </div>

            {voice.transcript && (
              <div className="w-full p-[16px] bg-surface-card rounded-[12px] border border-default-g">
                <p className="text-body text-primary-g">{voice.transcript}</p>
              </div>
            )}

            <div className="flex gap-[12px] w-full pt-[24px]">
              <button onClick={() => setStep("size")} className="h-[52px] px-[24px] rounded-[12px] border border-default-g bg-surface-card hover:bg-surface-muted transition-colors">
                <ChevronLeft className="h-[20px] w-[20px] text-secondary-g" />
              </button>
              <button onClick={() => setStep("review")} className="flex-1 h-[52px] rounded-[12px] bg-[var(--g-blue)] text-white text-h3 active:scale-[0.97] transition-transform">
                {voice.transcript ? "Review" : "Skip"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: REVIEW ── */}
        {step === "review" && ai && position && detectedLocality && (
          <div className="space-y-[24px] animate-fade-in pb-[32px]">
            
            <div className="bg-surface-card rounded-[16px] border border-default-g shadow-card-g overflow-hidden">
              <div className="relative h-[200px] bg-black">
                <img src={photo!} alt="Pothole" className="w-full h-full object-cover" />
              </div>
              <div className="p-[16px] space-y-[16px]">
                <div className="flex items-center gap-[8px]">
                  <MapPin className="h-[16px] w-[16px] text-secondary-g shrink-0" />
                  <span className="text-body font-[500] text-primary-g truncate">{detectedLocality.name}, Bengaluru</span>
                </div>
                
                <div className="flex items-center justify-between border-t border-default-g pt-[16px]">
                  <div>
                    <div className="text-label text-secondary-g uppercase tracking-[0.01em]">Calculated Priority</div>
                    <div className="text-display" style={{ color: ai.severity === "critical" ? "var(--g-red)" : ai.severity === "high" ? "var(--g-orange)" : "var(--g-yellow)" }}>
                      {ai.score}<span className="text-h3 text-secondary-g">/100</span>
                    </div>
                  </div>
                  <span className="g-chip" style={{ backgroundColor: ai.severity === "critical" ? "#fce8e6" : "#fef7e0", color: ai.severity === "critical" ? "#c5221f" : "#b06000" }}>
                    {ai.severity}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-[12px] flex-col">
              <button 
                onClick={submit} 
                disabled={submitting} 
                className="w-full h-[52px] rounded-[12px] bg-[var(--g-blue)] text-white text-h3 active:scale-[0.97] transition-transform flex items-center justify-center gap-2 shadow-lift-g disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-[20px] w-[20px] animate-spin" /> : "Submit Report"}
              </button>
              <div className="text-center text-hint text-secondary-g">
                Anonymous · No login required
              </div>
            </div>

            <button onClick={() => setStep("voice")} className="w-full h-[40px] mt-[16px] text-label text-secondary-g hover:bg-surface-muted rounded-[8px] transition-colors">
              Go Back
            </button>
          </div>
        )}

        {/* ── STEP 5: SUCCESS ── */}
        {step === "success" && (
          <div className="flex flex-col items-center justify-center text-center space-y-[24px] py-[48px] animate-fade-in">
            <div className="h-[64px] w-[64px] bg-[#e6f4ea] rounded-[50%] flex items-center justify-center text-[#137333]">
              <Check className="h-[32px] w-[32px]" strokeWidth={3} />
            </div>
            
            <div className="space-y-[8px]">
              <h2 className="text-h1">Report Submitted</h2>
              <p className="text-body text-secondary-g max-w-[280px]">Your contribution has been added to the municipal priority queue.</p>
            </div>

            <div className="w-full space-y-[12px] pt-[24px]">
              <Link to="/" className="flex items-center justify-center w-full h-[52px] rounded-[12px] bg-[var(--g-blue)] text-white text-h3 shadow-lift-g active:scale-[0.97] transition-transform">
                Return to Dashboard
              </Link>
              <button 
                onClick={() => { setStep("capture"); setPhoto(null); setSize(null); voice.setTranscript(""); }} 
                className="w-full h-[52px] rounded-[12px] border border-default-g bg-surface-card text-h3 text-primary-g hover:bg-surface-muted transition-colors"
              >
                Report Another Hazard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
