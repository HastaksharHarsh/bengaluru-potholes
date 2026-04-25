// ─── Auth routes ────────────────────────────────────────────────────────────
import { Router, Request, Response } from "express";
import { generateSupervisorToken } from "../middleware/auth";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

// POST /api/auth/supervisor/login
router.post("/supervisor/login", (req: Request, res: Response) => {
  const { username, password } = req.body;
  const validUser = process.env.SUPERVISOR_USERNAME || "admin";
  const validPass = process.env.SUPERVISOR_PASSWORD || "password123";

  if (username === validUser && password === validPass) {
    const token = generateSupervisorToken(username);
    res.json({ token, username, role: "supervisor", expiresIn: "24h" });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

export default router;
