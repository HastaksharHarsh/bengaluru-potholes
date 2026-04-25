// ─── Firebase Admin SDK initialization ──────────────────────────────────────
import admin from "firebase-admin";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const serviceAccountPath = path.resolve(
  process.env.GOOGLE_APPLICATION_CREDENTIALS || "./service-account.json"
);

import { localDb } from "./local-db";

let serviceAccount;
let isMockMode = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  serviceAccount = require(serviceAccountPath);
} catch (err) {
  console.warn("⚠️  service-account.json not found. Backend will run in MOCK MODE with local data.");
  isMockMode = true;
}

if (!admin.apps.length && !isMockMode) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.GCP_PROJECT_ID || "rentatulya6000",
    });
  } catch (err) {
    console.error("❌ Failed to initialize Firebase:", err);
    isMockMode = true;
  }
}

export const db = isMockMode ? (localDb as any) : admin.firestore();
export const firebaseAdmin = admin;
export const MOCK_MODE = isMockMode;

// Set Firestore settings
if (!isMockMode) {
  db.settings({ ignoreUndefinedProperties: true });
  console.log("✅ Firebase Admin SDK initialized for project:", process.env.GCP_PROJECT_ID);
}
