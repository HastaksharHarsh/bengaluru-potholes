import { Router, Request, Response } from "express";
import * as potholeService from "../services/pothole.service";
import { requireSupervisor } from "../middleware/auth";
import type { Severity } from "../models/types";

const router = Router();

// GET /api/progressions — Get potholes with progression data
router.get("/", async (req: Request, res: Response) => {
  try {
    const { localityId, wardId, severity, minDays } = req.query;

    const data = await potholeService.getProgressions({
      localityId: localityId as string,
      wardId: wardId as string,
      severity: severity as Severity,
      minDays: minDays ? parseInt(minDays as string) : undefined
    });

    // Compute summary stats
    const stats = {
      total: data.length,
      critical: data.filter(p => (p as any).riskLevel === "critical").length,
      avgDaysOpen: Math.round(data.reduce((sum, p) => sum + p.daysOpen, 0) / (data.length || 1)),
      escalatedThisWeek: data.filter(p => p.daysOpen >= 7 && p.daysOpen <= 14).length, // simplified escalation logic
      highRiskZones: Array.from(new Set(data.filter(p => (p as any).riskLevel === "critical").map(p => p.localityId))).length
    };

    console.log(`📊 Progressions API: Sending ${data.length} potholes. Stats:`, stats);
    res.json({ stats, potholes: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
