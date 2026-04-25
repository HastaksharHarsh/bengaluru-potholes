import fetch from "node-fetch";

const BACKEND_URL = "http://localhost:3001/api";
const PYTHON_URL = "http://localhost:8000";

async function checkHealth() {
  console.log("🔍 Analyzing Backend Connections...");
  
  const results = [];

  // 1. Node Health
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    results.push({ name: "Node Backend", status: res.ok ? "UP" : "DOWN", details: await res.json() });
  } catch (e: any) {
    results.push({ name: "Node Backend", status: "DOWN", error: e.message });
  }

  // 2. Python Health
  try {
    const res = await fetch(`${PYTHON_URL}/health`);
    results.push({ name: "Python ML Server", status: res.ok ? "UP" : "DOWN", details: await res.json() });
  } catch (e: any) {
    results.push({ name: "Python ML Server", status: "DOWN", error: e.message });
  }

  // 3. Essential Endpoints
  const endpoints = ["/wards", "/localities", "/stats/dashboard", "/reports/weekly"];
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${BACKEND_URL}${ep}`);
      results.push({ name: `Endpoint: ${ep}`, status: res.ok ? "OK" : "ERROR", code: res.status });
    } catch (e: any) {
      results.push({ name: `Endpoint: ${ep}`, status: "UNREACHABLE", error: e.message });
    }
  }

  console.table(results);

  const downServices = results.filter(r => r.status === "DOWN" || r.status === "UNREACHABLE");
  if (downServices.length > 0) {
    console.warn("\n❌ Some services are down or unreachable.");
  } else {
    console.log("\n✅ All core backend connections are active (Mock Mode enabled).");
  }
}

checkHealth();
