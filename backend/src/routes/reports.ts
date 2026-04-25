// ─── Report routes ──────────────────────────────────────────────────────────
import { Router, Request, Response } from "express";
import { generateWeeklyReport, getWeeklyReports, clearOldReports } from "../services/report.service";
import { requireSupervisor, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/reports/weekly — List past reports
router.get("/weekly", async (_req: Request, res: Response) => {
  try {
    const reports = await getWeeklyReports();

    // If no reports exist yet, auto-generate one from live data
    if (reports.length === 0) {
      const now = new Date();
      const weekName = `Week of ${now.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`;
      const fresh = await generateWeeklyReport(weekName);
      res.json([fresh]);
      return;
    }

    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/generate — Generate a new weekly report (supervisor)
router.post("/generate", requireSupervisor, async (req: AuthRequest, res: Response) => {
  try {
    const weekName = req.body.weekName || `Week of ${new Date().toLocaleDateString()}`;
    const report = await generateWeeklyReport(weekName);
    res.status(201).json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/refresh — Clear stale reports and generate a fresh one from live data
router.post("/refresh", async (_req: Request, res: Response) => {
  try {
    await clearOldReports();
    const now = new Date();
    const weekName = `Week of ${now.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`;
    const report = await generateWeeklyReport(weekName);
    res.status(201).json({ message: "Reports refreshed", report });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
