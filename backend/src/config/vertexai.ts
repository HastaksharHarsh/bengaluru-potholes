// ─── Google GenAI / Gemini client (replaces deprecated @google-cloud/vertexai) ──
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PROJECT_ID = process.env.GCP_PROJECT_ID || "rentatulya6000";
const REGION = process.env.GCP_REGION || "asia-south1";

// Initialize Google GenAI with Vertex AI backend
// Uses Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS)
export const genAI = new GoogleGenAI({
  vertexai: true,
  project: PROJECT_ID,
  location: REGION,
});

// Model name — used across all AI calls
export const GEMINI_MODEL = "gemini-2.5-pro";

console.log(`✅ Google GenAI initialized: ${GEMINI_MODEL} (${REGION})`);
