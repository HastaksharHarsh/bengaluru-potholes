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
