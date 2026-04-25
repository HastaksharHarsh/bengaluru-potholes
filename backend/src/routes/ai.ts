// ─── AI analysis routes ─────────────────────────────────────────────────────
import { Router, Request, Response } from "express";
import multer from "multer";
import * as aiService from "../services/ai.service";
import * as potholeService from "../services/pothole.service";
import { imageToBase64 } from "../services/upload.service";
import { db } from "../config/firebase";
import type { Locality, SizeBucket } from "../models/types";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/ai/analyze-image — Analyze pothole image with Gemini
router.post("/analyze-image", upload.single("image"), async (req: Request, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: "Image file required" }); return; }
    const base64 = imageToBase64(req.file.buffer);
    const analysis = await aiService.analyzeImage(base64, req.file.mimetype);
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/severity — Compute severity score
router.post("/severity", async (req: Request, res: Response) => {
  try {
    const { lat, lng, size } = req.body;
    if (!lat || !lng || !size) { res.status(400).json({ error: "lat, lng, size required" }); return; }

    const locSnap = await db.collection("localities").get();
    const localities = locSnap.docs.map((d) => d.data() as Locality);
    const nearest = localities.sort((a, b) => {
      const dA = Math.hypot(a.center.lat - lat, a.center.lng - lng);
      const dB = Math.hypot(b.center.lat - lat, b.center.lng - lng);
      return dA - dB;
    })[0];

    const nearby = await potholeService.findNearbyPotholes(lat, lng, 100);
    const result = await aiService.computeSeverity(size as SizeBucket, { lat, lng }, nearest, nearby);
    res.json({ ...result, locality: nearest.name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
