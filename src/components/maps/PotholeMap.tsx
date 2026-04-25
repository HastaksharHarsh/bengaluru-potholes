import { GoogleMap, MarkerF, InfoWindowF } from "@react-google-maps/api";
import { useEffect, useState } from "react";
import { BENGALURU_CENTER, Pothole, potholes as allPotholes, severityColor, getLocality, getWard } from "@/lib/bengaluru-data";
import { Badge } from "@/components/ui/badge";
import { GoogleMapsKeyPrompt, useGoogleMapsKey } from "./GoogleMapsKey";
import { PotholeStatusBadge } from "@/components/PotholeStatusBadge";

const LIBS = ["places"];
const GMAPS_SCRIPT_ID = "gmaps-script";

let googleMapsLoadPromise: Promise<void> | null = null;
let googleMapsLoadKey: string | null = null;

function loadGoogleMaps(apiKey: string) {
  const key = apiKey.trim();

  if (!key) return Promise.reject(new Error("Google Maps API key is required."));
  if (window.google?.maps?.Map) return Promise.resolve();
  if (googleMapsLoadPromise && googleMapsLoadKey === key) return googleMapsLoadPromise;

  const existing = document.getElementById(GMAPS_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing && existing.dataset.apiKey !== key) {
    existing.remove();
    googleMapsLoadPromise = null;
    googleMapsLoadKey = null;
  }

  const current = document.getElementById(GMAPS_SCRIPT_ID) as HTMLScriptElement | null;
  if (current && current.dataset.apiKey === key) {
    googleMapsLoadPromise = new Promise((resolve, reject) => {
      current.addEventListener("load", () => resolve(), { once: true });
      current.addEventListener("error", () => reject(new Error("Google Maps failed to load.")), { once: true });
    });
    googleMapsLoadKey = key;
    return googleMapsLoadPromise;
  }

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      key,
      v: "weekly",
      loading: "async",
      libraries: LIBS.join(","),
      language: "en",
      region: "IN",
      auth_referrer_policy: "origin",
    });
    const script = document.createElement("script");
    script.id = GMAPS_SCRIPT_ID;
    script.dataset.apiKey = key;
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load."));
    document.head.appendChild(script);
  });
  googleMapsLoadKey = key;
  return googleMapsLoadPromise;
}

function useGoogleMapsScript(apiKey: string) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoaded(false);
    setLoadError(null);

    loadGoogleMaps(apiKey)
      .then(() => {
        if (active) setIsLoaded(true);
      })
      .catch((error) => {
        if (active) setLoadError(error instanceof Error ? error : new Error("Google Maps failed to load."));
      });

    return () => {
      active = false;
    };
  }, [apiKey]);

  return { isLoaded, loadError };
}

const containerStyle = { width: "100%", height: "100%" };

const mapStyles: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dee5ee" }] },
  { featureType: "water", stylers: [{ color: "#a8d8e6" }] },
  { featureType: "landscape", stylers: [{ color: "#f4f3ee" }] },
];

interface Props {
  potholes?: Pothole[];
  showHeatmap?: boolean;
  height?: string;
  zoom?: number;
  center?: { lat: number; lng: number };
  onSelect?: (p: Pothole) => void;
}

export function PotholeMap(props: Props) {
  const { key, setKey } = useGoogleMapsKey();
  const height = props.height ?? "70vh";

  if (!key) {
    return (
      <div style={{ height }} className="flex items-center justify-center bg-muted/30 rounded-xl p-6">
        <GoogleMapsKeyPrompt onSave={setKey} />
      </div>
    );
  }

  return <PotholeMapInner {...props} apiKey={key} onResetKey={() => setKey("")} />;
}

function PotholeMapInner({
  potholes = allPotholes,
  showHeatmap = false,
  height = "70vh",
  zoom = 11,
  center = BENGALURU_CENTER,
  onSelect,
  apiKey,
  onResetKey,
}: Props & { apiKey: string; onResetKey: () => void }) {
  const { isLoaded, loadError } = useGoogleMapsScript(apiKey);
  const [selected, setSelected] = useState<Pothole | null>(null);

  if (loadError) {
    return (
      <div style={{ height }} className="flex flex-col items-center justify-center bg-muted/30 rounded-xl p-6 gap-3">
        <p className="text-destructive font-medium">Failed to load Google Maps.</p>
        <p className="text-sm text-muted-foreground">Check the API key and ensure Maps JavaScript API is enabled.</p>
        <button onClick={onResetKey} className="text-sm text-primary underline">
          Replace key
        </button>
      </div>
    );
  }

  if (!isLoaded) {
    return <div style={{ height }} className="bg-muted/30 rounded-xl animate-pulse" />;
  }

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden shadow-soft border border-border">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        options={{
          styles: mapStyles,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      >
        {potholes.map((p) => (
            <MarkerF
              key={p.id}
              position={p.position}
              onClick={() => {
                setSelected(p);
                onSelect?.(p);
              }}
              icon={{
                path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
                scale: p.severity === "critical" ? 9 : p.severity === "high" ? 7 : 6,
                fillColor: p.status === "repaired" ? "#10b981" : severityColor(p.severity),
                fillOpacity: showHeatmap ? 0.3 : 0.9,
                strokeColor: p.reoccurred ? "#ef4444" : "#fff",
                strokeWeight: p.reoccurred ? 3 : (showHeatmap ? 0 : 2),
              }}
            />
          ))}

        {selected && (
          <InfoWindowF position={selected.position} onCloseClick={() => setSelected(null)}>
            <div className="text-sm font-sans max-w-[220px]">
              <div className="font-semibold text-foreground">{selected.road}</div>
              <div className="text-muted-foreground text-xs mt-0.5">
                {getLocality(selected.localityId).name} • Ward {getWard(selected.wardId).number}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <PotholeStatusBadge pothole={selected} />
                <Badge
                  style={{ backgroundColor: severityColor(selected.severity), color: "white" }}
                  className="capitalize"
                >
                  {selected.severity}
                </Badge>
                {selected.reoccurred && (
                  <Badge className="bg-destructive hover:bg-destructive text-[10px] px-1.5 py-0.5">
                    Improper Repair
                  </Badge>
                )}
                {!selected.reoccurred && <span className="text-xs text-muted-foreground">Score {selected.severityScore}</span>}
              </div>
              <div className="text-xs mt-2 text-muted-foreground">
                {selected.reports} reports • {selected.daysOpen}d open
                {selected.slaBreached && <span className="text-destructive font-medium"> • SLA breached</span>}
              </div>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}
