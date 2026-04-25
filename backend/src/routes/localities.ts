// ─── Locality routes ────────────────────────────────────────────────────────
import { Router, Request, Response } from "express";
import { db } from "../config/firebase";
import { getAllLocalitiesWithHealth, getLocalityHealthScore } from "../services/stats.service";
import { listPotholes } from "../services/pothole.service";
import type { Locality, Ward } from "../models/types";

const router = Router();

// GET /api/localities — All localities with health scores
router.get("/", async (_req: Request, res: Response) => {
  try {
    const data = await getAllLocalitiesWithHealth();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/localities/:id — Locality detail
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const locDoc = await db.collection("localities").doc(req.params.id).get();
    if (!locDoc.exists) { res.status(404).json({ error: "Locality not found" }); return; }
    const locality = locDoc.data() as Locality;
    const healthScore = await getLocalityHealthScore(req.params.id);

    // Get associated ward(s)
    const wardDoc = await db.collection("wards").doc(locality.wardId).get();
    const ward = wardDoc.exists ? wardDoc.data() as Ward : null;

    const { potholes, total } = await listPotholes({ localityId: req.params.id, limit: 50 });
    res.json({ ...locality, healthScore, ward, potholes, totalPotholes: total });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
