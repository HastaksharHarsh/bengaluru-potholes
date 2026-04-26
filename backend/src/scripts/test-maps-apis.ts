import dotenv from "dotenv";
import fetch from "node-fetch";
import path from "path";

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const GMAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_MAP_API_KEY || "";

async function testRoadsApi() {
  console.log("\n🚗 Testing Google Roads API...");
  if (!GMAPS_KEY) {
    console.error("❌ Error: GOOGLE_MAPS_API_KEY not found in environment.");
    return false;
  }

  // Test point: Vidhana Soudha, Bengaluru
  const lat = 12.9797;
  const lng = 77.5912;
  const url = `https://roads.googleapis.com/v1/nearestRoads?points=${lat},${lng}&key=${GMAPS_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (res.ok) {
      console.log("✅ Roads API is ENABLED!");
      console.log(`📍 Snapped to: ${data.snappedPoints?.[0]?.placeId || "Unknown"}`);
      return true;
    } else {
      console.error(`❌ Roads API Error (${res.status}):`, data.error?.message || JSON.stringify(data));
      if (data.error?.status === "PERMISSION_DENIED") {
        console.error("💡 Tip: Ensure 'Roads API' is enabled in your Google Cloud Console.");
      }
      return false;
    }
  } catch (err: any) {
    console.error("❌ Roads API Fetch Failed:", err.message);
    return false;
  }
}

async function testRoutesApi() {
  console.log("\n🚦 Testing Google Routes API (v2)...");
  if (!GMAPS_KEY) return false;

  const url = "https://routes.googleapis.com/directions/v2:computeRoutes";
  const body = {
    origin: { location: { latLng: { latitude: 12.9797, longitude: 77.5912 } } },
    destination: { location: { latLng: { latitude: 12.9800, longitude: 77.5920 } } },
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GMAPS_KEY,
        "X-Goog-FieldMask": "routes.duration,routes.staticDuration",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (res.ok) {
      console.log("✅ Routes API is ENABLED!");
      console.log(`⏱️  Duration: ${data.routes?.[0]?.duration || "N/A"}`);
      return true;
    } else {
      console.error(`❌ Routes API Error (${res.status}):`, data.error?.message || JSON.stringify(data));
      if (data.error?.status === "PERMISSION_DENIED") {
        console.error("💡 Tip: Ensure 'Routes API' is enabled in your Google Cloud Console.");
      }
      return false;
    }
  } catch (err: any) {
    console.error("❌ Routes API Fetch Failed:", err.message);
    return false;
  }
}

async function runTests() {
  console.log("🔍 Starting Google Maps API Diagnostic...");
  console.log(`🔑 Using Key: ${GMAPS_KEY.slice(0, 8)}...${GMAPS_KEY.slice(-4)}`);

  const roadsOk = await testRoadsApi();
  const routesOk = await testRoutesApi();

  console.log("\n--- Summary ---");
  if (roadsOk && routesOk) {
    console.log("🚀 All systems go! Traffic analysis should work perfectly.");
  } else {
    console.log("⚠️  Some APIs failed. Check the error messages above and the GCP console.");
  }
}

runTests();
