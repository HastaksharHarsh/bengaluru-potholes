// Lightweight i18n: English / Kannada toggle persisted to localStorage.
import { create } from "zustand";

export type Lang = "en" | "kn";

type Dict = Record<string, { en: string; kn: string }>;

const dict: Dict = {
  app_name: { en: "Bengaluru Road Watch", kn: "ಬೆಂಗಳೂರು ರಸ್ತೆ ನೋಟ" },
  tagline: { en: "Smart City Pothole Intelligence • BBMP", kn: "ಸ್ಮಾರ್ಟ್ ಸಿಟಿ ಪಾಟ್‌ಹೋಲ್ ಇಂಟೆಲಿಜೆನ್ಸ್ • ಬಿಬಿಎಂಪಿ" },
  nav_dashboard: { en: "Dashboard", kn: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್" },
  nav_report: { en: "Report a Pothole", kn: "ಗುಂಡಿ ವರದಿ ಮಾಡಿ" },
  nav_map: { en: "Live Map", kn: "ಲೈವ್ ನಕ್ಷೆ" },
  nav_localities: { en: "Localities", kn: "ಪ್ರದೇಶಗಳು" },
  nav_wards: { en: "Ward Ranking", kn: "ವಾರ್ಡ್ ಶ್ರೇಣಿ" },
  nav_reports: { en: "Reports", kn: "ವರದಿಗಳು" },
  hero_cta: { en: "Report a Pothole", kn: "ಗುಂಡಿ ವರದಿ ಮಾಡಿ" },
  step_capture: { en: "Capture", kn: "ಸೆರೆಹಿಡಿಯಿರಿ" },
  step_size: { en: "Size", kn: "ಗಾತ್ರ" },
  step_voice: { en: "Voice Note", kn: "ಧ್ವನಿ ಟಿಪ್ಪಣಿ" },
  step_review: { en: "Review", kn: "ಪರಿಶೀಲಿಸಿ" },
  size_small: { en: "Small", kn: "ಚಿಕ್ಕದು" },
  size_medium: { en: "Medium", kn: "ಮಧ್ಯಮ" },
  size_large: { en: "Large", kn: "ದೊಡ್ಡದು" },
  size_small_desc: { en: "< 30 cm wide", kn: "30 ಸೆಂ.ಮೀ ಗಿಂತ ಕಡಿಮೆ" },
  size_medium_desc: { en: "30 – 60 cm wide", kn: "30–60 ಸೆಂ.ಮೀ" },
  size_large_desc: { en: "> 60 cm wide • dangerous", kn: "60 ಸೆಂ.ಮೀ ಮೇಲೆ • ಅಪಾಯಕಾರಿ" },
  open_camera: { en: "Open Camera", kn: "ಕ್ಯಾಮೆರಾ ತೆರೆಯಿರಿ" },
  retake: { en: "Retake", kn: "ಮರು-ತೆಗೆ" },
  use_photo: { en: "Use this photo", kn: "ಈ ಫೋಟೋ ಬಳಸಿ" },
  next: { en: "Next", kn: "ಮುಂದೆ" },
  back: { en: "Back", kn: "ಹಿಂದೆ" },
  submit: { en: "Submit Report", kn: "ವರದಿ ಸಲ್ಲಿಸಿ" },
  voice_hint: { en: "Tap mic and describe the pothole", kn: "ಮೈಕ್ ಒತ್ತಿ ಗುಂಡಿಯನ್ನು ವಿವರಿಸಿ" },
  listening: { en: "Listening…", kn: "ಆಲಿಸುತ್ತಿದೆ…" },
  detected_location: { en: "Detected location", kn: "ಪತ್ತೆ ಸ್ಥಳ" },
  ai_severity: { en: "AI Severity Estimate", kn: "AI ತೀವ್ರತೆ ಅಂದಾಜು" },
  duplicate_warn: { en: "A similar pothole was reported nearby — your report will upvote it.", kn: "ಸಮೀಪ ಇದೇ ರೀತಿ ವರದಿ ಆಗಿದೆ — ನಿಮ್ಮ ವರದಿ ಅದನ್ನು ಬೆಂಬಲಿಸುತ್ತದೆ." },
  total_potholes: { en: "Total Potholes", kn: "ಒಟ್ಟು ಗುಂಡಿಗಳು" },
  critical_zones: { en: "Critical Zones", kn: "ಅತ್ಯಂತ ಅಪಾಯ ವಲಯ" },
  avg_resolution: { en: "Avg Resolution", kn: "ಸರಾಸರಿ ಪರಿಹಾರ" },
  sla_breached: { en: "SLA Breached", kn: "SLA ಉಲ್ಲಂಘನೆ" },
  monsoon_alert: { en: "Monsoon Alert", kn: "ಮಳೆಗಾಲದ ಎಚ್ಚರಿಕೆ" },
};

export function t(key: keyof typeof dict, lang: Lang) {
  return dict[key]?.[lang] ?? key;
}

interface I18nState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: keyof typeof dict) => string;
}

export const useI18n = create<I18nState>((set, get) => ({
  lang: (typeof window !== "undefined" && (localStorage.getItem("lang") as Lang)) || "en",
  setLang: (l) => {
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
    set({ lang: l });
  },
  t: (k) => t(k, get().lang),
}));
