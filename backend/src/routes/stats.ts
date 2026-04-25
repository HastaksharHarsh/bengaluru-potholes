// ─── Dashboard stats routes ─────────────────────────────────────────────────
import { Router, Request, Response } from "express";
import { getDashboardStats } from "../services/stats.service";

const router = Router();

// GET /api/stats/dashboard
router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.query;
    const stats = await getDashboardStats(
      lat ? parseFloat(lat as string) : undefined,
      lng ? parseFloat(lng as string) : undefined
    );
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
