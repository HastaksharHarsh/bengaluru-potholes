// ─── Server entry point ─────────────────────────────────────────────────────
import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { ensureBucket } from "./config/storage";

const PORT = parseInt(process.env.PORT || "3001", 10);

async function start() {
  console.log("🚀 Starting Bengaluru Road Watch Backend...");
  console.log(`📦 GCP Project: ${process.env.GCP_PROJECT_ID}`);
  console.log(`🌏 Region: ${process.env.GCP_REGION}`);

  // Ensure GCS bucket exists
  await ensureBucket();

  app.listen(PORT, () => {
    console.log(`\n✅ Server running at http://localhost:${PORT}`);
    console.log(`📡 API base: http://localhost:${PORT}/api`);
    console.log(`❤️  Health: http://localhost:${PORT}/api/health\n`);
  });
}

start().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
 
