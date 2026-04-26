// ─── Express app setup ──────────────────────────────────────────────────────
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/error-handler";

// Routes
import potholeRoutes from "./routes/potholes";
import aiRoutes from "./routes/ai";
import wardRoutes from "./routes/wards";
import localityRoutes from "./routes/localities";
import statsRoutes from "./routes/stats";
import reportRoutes from "./routes/reports";
import authRoutes from "./routes/auth";
import * as potholeService from "./services/pothole.service";

dotenv.config();

const app = express();

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Routes ──────────────────────────────────────────────────────────────────

// Direct mounting of progressions to avoid 404
app.get("/api/progressions", async (req, res) => {
  try {
    const { localityId, wardId, severity, minDays } = req.query;
    const data = await potholeService.getProgressions({
      localityId: localityId as string,
      wardId: wardId as string,
      severity: severity as any,
      minDays: minDays ? parseInt(minDays as string) : undefined
    });
    const stats = {
      total: data.length,
      critical: data.filter((p: any) => p.riskLevel === "critical").length,
      avgDaysOpen: Math.round(data.reduce((sum, p) => sum + p.daysOpen, 0) / (data.length || 1)),
      escalatedThisWeek: data.filter(p => p.daysOpen >= 7 && p.daysOpen <= 14).length,
      highRiskZones: Array.from(new Set(data.filter((p: any) => p.riskLevel === "critical").map(p => p.localityId))).length
    };
    res.json({ stats, potholes: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.use("/api/potholes", potholeRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/wards", wardRoutes);
app.use("/api/localities", localityRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/auth", authRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", project: process.env.GCP_PROJECT_ID, timestamp: new Date().toISOString() });
});

// ── Error Handler ───────────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
