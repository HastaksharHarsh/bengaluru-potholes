// ─── Vertex AI / Gemini 2.5 Pro client ──────────────────────────────────────
import { VertexAI } from "@google-cloud/vertexai";
import dotenv from "dotenv";

dotenv.config();

const PROJECT_ID = process.env.GCP_PROJECT_ID || "rentatulya6000";
const REGION = process.env.GCP_REGION || "asia-south1";

// Initialize Vertex AI — uses GOOGLE_APPLICATION_CREDENTIALS automatically
export const vertexAI = new VertexAI({
  project: PROJECT_ID,
  location: REGION,
});

// Gemini 2.5 Pro model — used for all AI tasks
export const geminiModel = vertexAI.getGenerativeModel({
  model: "gemini-2.5-pro",
});

console.log(`✅ Vertex AI initialized: Gemini 2.5 Pro (${REGION})`);
