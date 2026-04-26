// ─── Traffic Service — Google Maps Platform Integration ──────────────────────
import fetch from "node-fetch";

// Uses the Roads API (speed limits) and Routes API (congestion ratio) to
// derive a real-time traffic impact score for a pothole location.

const GMAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_MAP_API_KEY || process.env.VITE_GOOGLE_MAPS_KEY || "";

if (!GMAPS_KEY) {
    console.warn(
        "⚠️  Google Maps API Key not found in environment variables (GOOGLE_MAPS_API_KEY or VITE_MAP_API_KEY). Traffic scoring will use locality static fallback."
    );
}

export interface TrafficData {
    trafficScore: number;       // 0–100 composite score
    speedLimitKph: number;      // Posted speed limit from Roads API
    congestionRatio: number;    // duration / staticDuration (1.0 = free flow)
    isArterial: boolean;        // true if speedLimitKph >= 60
    source: "live" | "fallback";
}

// ─── Roads API: Speed Limit ───────────────────────────────────────────────────
async function fetchSpeedLimit(lat: number, lng: number): Promise<number> {
    // Step 1: Snap to road
    const snapUrl =
        `https://roads.googleapis.com/v1/nearestRoads?points=${lat},${lng}&key=${GMAPS_KEY}`;
    const snapRes = await fetch(snapUrl);
    if (!snapRes.ok) throw new Error(`Roads snapToRoads failed: ${snapRes.status}`);
    const snapData = await snapRes.json();

    const snapped = snapData?.snappedPoints?.[0];
    if (!snapped?.placeId) throw new Error("No snapped road found");

    // Step 2: Get speed limit for that placeId
    const slUrl =
        `https://roads.googleapis.com/v1/speedLimits?placeId=${snapped.placeId}&key=${GMAPS_KEY}`;
    const slRes = await fetch(slUrl);
    if (!slRes.ok) throw new Error(`Roads speedLimits failed: ${slRes.status}`);
    const slData = await slRes.json();

    const kph = slData?.speedLimits?.[0]?.speedLimit;
    if (!kph) throw new Error("Speed limit not returned");
    // API returns mph for US, kph for India by default; we pass units=KPH to be safe
    return kph;
}

// ─── Routes API: Congestion Ratio ────────────────────────────────────────────
async function fetchCongestionRatio(lat: number, lng: number): Promise<number> {
    // Create a tiny 200-m probe route around the pothole (cardinal offset)
    const DELTA = 0.001; // ~111 m per 0.001°
    const body = {
        origin: { location: { latLng: { latitude: lat - DELTA, longitude: lng } } },
        destination: { location: { latLng: { latitude: lat + DELTA, longitude: lng } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: false,
    };

    const routesRes = await fetch(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": GMAPS_KEY,
                "X-Goog-FieldMask": "routes.duration,routes.staticDuration",
            },
            body: JSON.stringify(body),
        }
    );

    if (!routesRes.ok) throw new Error(`Routes API failed: ${routesRes.status}`);
    const routesData = await routesRes.json();

    const route = routesData?.routes?.[0];
    if (!route) throw new Error("No route returned");

    // duration and staticDuration come as strings like "120s"
    const parseSec = (s: string): number => parseInt(s.replace("s", ""), 10) || 1;
    const duration = parseSec(route.duration);
    const staticDuration = parseSec(route.staticDuration);

    return Math.max(1, duration / Math.max(1, staticDuration));
}

// ─── Composite Scoring ────────────────────────────────────────────────────────
/**
 * Returns a 0–100 traffic impact score for the given GPS coordinates.
 * Falls back gracefully when the API key is missing or calls fail.
 */
export async function getTrafficScore(
    lat: number,
    lng: number,
    fallbackTrafficDensity = 50
): Promise<TrafficData> {
    if (!GMAPS_KEY) {
        return buildFallback(fallbackTrafficDensity);
    }

    try {
        const [speedLimitKph, congestionRatio] = await Promise.all([
            fetchSpeedLimit(lat, lng),
            fetchCongestionRatio(lat, lng),
        ]);

        // Speed score: 80+ km/h = full weight (highway / arterial)
        const speedScore = Math.min(100, (speedLimitKph / 80) * 100);

        // Congestion score: 1.0 = 0 pts, 3.0+ = 100 pts
        const congestionScore = Math.min(100, ((congestionRatio - 1) / 2) * 100);

        const trafficScore = Math.round(speedScore * 0.6 + congestionScore * 0.4);
        const isArterial = speedLimitKph >= 60;

        console.log(
            `🚦 Traffic score fetched: { trafficScore: ${trafficScore}, speedLimitKph: ${speedLimitKph}, congestionRatio: ${congestionRatio.toFixed(2)} }`
        );

        return { trafficScore, speedLimitKph, congestionRatio, isArterial, source: "live" };
    } catch (err: any) {
        console.warn(`⚠️  Traffic API error (using fallback): ${err.message}`);
        return buildFallback(fallbackTrafficDensity);
    }
}

function buildFallback(density: number): TrafficData {
    return {
        trafficScore: density,
        speedLimitKph: density >= 70 ? 60 : 40,
        congestionRatio: 1.0,
        isArterial: density >= 70,
        source: "fallback",
    };
}
