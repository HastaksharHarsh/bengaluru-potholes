import { GoogleMap, MarkerF, InfoWindowF, useJsApiLoader } from "@react-google-maps/api";
import { useEffect, useState, useMemo } from "react";
import { BENGALURU_CENTER, Pothole, severityColor, getLocality, getWard } from "@/lib/bengaluru-data";
import { fetchProgression, type ProgressionResult } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { GoogleMapsKeyPrompt, useGoogleMapsKey } from "./GoogleMapsKey";
import { PotholeStatusBadge } from "@/components/PotholeStatusBadge";

const LIBS: ("places")[] = ["places"];

// Removed custom loadGoogleMaps and useGoogleMapsScript
// We will use useJsApiLoader from @react-google-maps/api in PotholeMapInner instead


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

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function PotholeMapInner({
  potholes = [],
  showHeatmap = false,
  height = "70vh",
  zoom = 11,
  center = BENGALURU_CENTER,
  onSelect,
  apiKey,
  onResetKey,
}: Props & { apiKey: string; onResetKey: () => void }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: LIBS,
  });

  const [selected, setSelected] = useState<Pothole | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);

  // Fetch progression when a marker is selected
  useEffect(() => {
    if (selected) {
      setProgression(null);
      fetchProgression(selected.position.lat, selected.position.lng, 50)
        .then(setProgression)
        .catch(() => setProgression(null));
    }
  }, [selected]);

  const clusteredPotholes = useMemo(() => {
    const clustered: Pothole[] = [];
    const radius = 35; // Merge markers within 35 meters
    const used = new Set<string>();

    for (const p of potholes) {
      if (used.has(p.id)) continue;

      const cluster = [p];
      used.add(p.id);

      for (const other of potholes) {
        if (!used.has(other.id) && distanceMeters(p.position, other.position) <= radius) {
          cluster.push(other);
          used.add(other.id);
        }
      }

      if (cluster.length === 1) {
        clustered.push(p);
      } else {
        const merged: Pothole = { ...p };
        merged.reports = cluster.reduce((sum, c) => sum + (c.reports || 1), 0);
        merged.severityScore = Math.min(100, Math.max(...cluster.map(c => c.severityScore)) + (cluster.length - 1) * 2);

        merged.position = {
          lat: cluster.reduce((sum, c) => sum + c.position.lat, 0) / cluster.length,
          lng: cluster.reduce((sum, c) => sum + c.position.lng, 0) / cluster.length,
        };
        merged.reoccurred = cluster.some(c => c.reoccurred);

        // Upgrade severity visually if score got bumped
        if (merged.severityScore >= 80) merged.severity = "critical";
        else if (merged.severityScore >= 60) merged.severity = "high";
        else if (merged.severityScore >= 40) merged.severity = "medium";

        merged.id = "cluster-" + p.id;
        clustered.push(merged);
      }
    }
    return clustered;
  }, [potholes]);

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
        {clusteredPotholes.map((p) => (
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
              {selected.trafficScore !== undefined && (
                <div className="text-xs mt-1.5 flex items-center gap-1 font-medium" style={{ color: selected.trafficScore >= 70 ? "#ef4444" : selected.trafficScore >= 40 ? "#f97316" : "#22c55e" }}>
                  🚦 Traffic: {selected.trafficScore}/100
                  {selected.speedLimitKph && <span className="text-muted-foreground font-normal"> · {selected.speedLimitKph} km/h</span>}
                  {selected.congestionRatio && selected.congestionRatio > 1.1 && (
                    <span className="text-muted-foreground font-normal"> · {selected.congestionRatio.toFixed(1)}× congested</span>
                  )}
                </div>
              )}
              {/* Cluster Progression */}
              {progression && progression.clusterSize > 1 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 6,
                      color: "white",
                      backgroundColor:
                        progression.riskLabel === "Critical Hotspot" ? "#dc2626" :
                          progression.riskLabel === "Deteriorating" ? "#f97316" :
                            progression.riskLabel === "Recovering" ? "#22c55e" : "#6b7280",
                    }}>
                      {progression.riskLabel}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {progression.clusterSize} reports nearby
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span>{progression.trend === "worsening" ? "↑" : progression.trend === "improving" ? "↓" : "→"}</span>
                    <span>Trend: {progression.trendScore > 0 ? "+" : ""}{progression.trendScore}</span>
                    <span>· Avg: {progression.avgSeverityScore}/100</span>
                  </div>
                  {/* Mini timeline */}
                  <div className="flex gap-0.5 mt-1.5" style={{ height: 16 }}>
                    {progression.timelineEntries.map((e, i) => (
                      <div
                        key={e.id}
                        title={`${new Date(e.reportedAt).toLocaleDateString()} — Score: ${e.severityScore}`}
                        style={{
                          flex: 1,
                          borderRadius: 2,
                          backgroundColor: severityColor(e.severity as any),
                          opacity: 0.4 + (i / progression.timelineEntries.length) * 0.6,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}
