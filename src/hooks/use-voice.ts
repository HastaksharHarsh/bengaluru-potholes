// Web Speech API wrapper supporting English (en-IN) and Kannada (kn-IN).
import { useEffect, useRef, useState } from "react";

type SpeechRecognition = any;

export function useVoiceRecognition(lang: "en" | "kn") {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const start = () => {
    setError(null);
    setTranscript("");
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Speech recognition not supported in this browser. Try Chrome.");
      return;
    }
    const rec = new SR();
    rec.lang = lang === "kn" ? "kn-IN" : "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);
    rec.onerror = (e: any) => {
      setError(e?.error || "Recognition failed");
      setListening(false);
    };
    rec.onend = () => setListening(false);
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setTranscript(text);
    };

    try {
      rec.start();
      recRef.current = rec;
    } catch (err: any) {
      setError(err?.message || "Could not start mic");
    }
  };

  const stop = () => {
    recRef.current?.stop();
    setListening(false);
  };

  return { supported, listening, transcript, error, start, stop, setTranscript };
}
