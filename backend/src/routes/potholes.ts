// ─── Pothole routes ─────────────────────────────────────────────────────────
import { Router, Request, Response } from "express";
import multer from "multer";
import { db } from "../config/firebase";
import * as potholeService from "../services/pothole.service";
import * as aiService from "../services/ai.service";
import { uploadPotholeImage, imageToBase64 } from "../services/upload.service";
import { requireSupervisor, AuthRequest } from "../middleware/auth";
import type { Locality, PotholeStatus, Severity, SizeBucket } from "../models/types";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/potholes — Submit a new pothole report
router.post("/", upload.single("image"), async (req: Request, res: Response) => {
  try {
    const { lat, lng, size, voiceNote } = req.body;
    if (!lat || !lng || !size) {
      res.status(400).json({ error: "lat, lng, and size are required" });
      return;
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const sizeBucket = size as SizeBucket;

    // Find nearest locality
    const locSnap = await db.collection("localities").get();
    const localities = locSnap.docs.map((d) => d.data() as Locality);
    const nearest = localities.sort((a, b) => {
      const dA = Math.hypot(a.center.lat - latitude, a.center.lng - longitude);
      const dB = Math.hypot(b.center.lat - latitude, b.center.lng - longitude);
      return dA - dB;
    })[0];

    // Check for duplicates
    const nearby = await potholeService.findNearbyPotholes(latitude, longitude, 30);
    const activeNearby = nearby.filter((p) => p.status !== "repaired");
    const repairedNearby = nearby.filter((p) => p.status === "repaired");

    if (activeNearby.length > 0) {
      // Upvote existing pothole instead
      const existing = activeNearby[0];
      const result = await potholeService.upvotePothole(existing.id);
      res.status(200).json({ duplicate: true, potholeId: existing.id, upvotes: result?.upvotes });
      return;
    }

    // Upload image if provided
    let imageUrl: string | undefined;
    if (req.file) {
      const tempId = `ph-${Date.now()}`;
      imageUrl = await uploadPotholeImage(req.file.buffer, tempId, req.file.mimetype);
    }

    // Compute AI severity
    const allNearby = await potholeService.findNearbyPotholes(latitude, longitude, 100);
    const severity = await aiService.computeSeverity(sizeBucket, { lat: latitude, lng: longitude }, nearest, allNearby);

    const isReoccurrence = repairedNearby.length > 0;

    const pothole = await potholeService.createPothole({
      localityId: nearest.id,
      wardId: nearest.wardId,
      lat: latitude,
      lng: longitude,
      severity: severity.severity,
      severityScore: severity.score,
      size: sizeBucket,
      road: "Unknown Road",
      imageUrl,
      voiceNote,
      reoccurred: isReoccurrence,
      improperRepair: isReoccurrence,
      linkedPreviousId: isReoccurrence ? repairedNearby[0].id : null,
    });

    res.status(201).json({ pothole, severity, duplicate: false, isReoccurrence });
  } catch (err: any) {
    console.error("Error creating pothole:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/potholes — List potholes
router.get("/", async (req: Request, res: Response) => {
  try {
    const { limit, offset, severity, status, localityId, wardId, sortBy, sortDir } = req.query;
    const result = await potholeService.listPotholes({
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0,
      severity: severity as Severity | undefined,
      status: status as PotholeStatus | undefined,
      localityId: localityId as string | undefined,
      wardId: wardId as string | undefined,
      sortBy: sortBy as string | undefined,
      sortDir: sortDir as "asc" | "desc" | undefined,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/potholes/map — Lightweight map data
router.get("/map", async (_req: Request, res: Response) => {
  try {
    const data = await potholeService.getMapPotholes();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/potholes/nearby — Find nearby potholes
router.get("/nearby", async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng) { res.status(400).json({ error: "lat and lng required" }); return; }
    const potholes = await potholeService.findNearbyPotholes(
      parseFloat(lat as string), parseFloat(lng as string), radius ? parseFloat(radius as string) : 30
    );
    res.json(potholes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/potholes/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const pothole = await potholeService.getPotholeById(req.params.id);
    if (!pothole) { res.status(404).json({ error: "Not found" }); return; }
    res.json(pothole);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/potholes/:id/status — Update status (supervisor only)
router.patch("/:id/status", requireSupervisor, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) { res.status(400).json({ error: "status is required" }); return; }
    const pothole = await potholeService.updatePotholeStatus(req.params.id, status);
    if (!pothole) { res.status(404).json({ error: "Not found" }); return; }
    res.json(pothole);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/potholes/:id/upvote
router.post("/:id/upvote", async (req: Request, res: Response) => {
  try {
    const result = await potholeService.upvotePothole(req.params.id);
    if (!result) { res.status(404).json({ error: "Not found" }); return; }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
