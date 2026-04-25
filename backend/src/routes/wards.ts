// ─── Ward routes ────────────────────────────────────────────────────────────
import { Router, Request, Response } from "express";
import { db } from "../config/firebase";
import { getWardRankings, getWardStats } from "../services/stats.service";
import { listPotholes } from "../services/pothole.service";
import type { Ward } from "../models/types";

const router = Router();

// GET /api/wards — All wards ranked by performance
router.get("/", async (_req: Request, res: Response) => {
  try {
    const rankings = await getWardRankings();
    res.json(rankings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wards/:id — Ward detail with stats + potholes
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const wardDoc = await db.collection("wards").doc(req.params.id).get();
    if (!wardDoc.exists) { res.status(404).json({ error: "Ward not found" }); return; }
    const ward = wardDoc.data() as Ward;
    const stats = await getWardStats(req.params.id);
    const { potholes } = await listPotholes({ wardId: req.params.id, limit: 50 });
    res.json({ ...ward, ...stats, potholes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
