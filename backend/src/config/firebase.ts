// ─── Firebase Admin SDK initialization ──────────────────────────────────────
import admin from "firebase-admin";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const serviceAccountPath = path.resolve(
  process.env.GOOGLE_APPLICATION_CREDENTIALS || "./service-account.json"
);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.GCP_PROJECT_ID || "rentatulya6000",
  });
}

export const db = admin.firestore();
export const firebaseAdmin = admin;

// Set Firestore settings
db.settings({ ignoreUndefinedProperties: true });

console.log("✅ Firebase Admin SDK initialized for project:", process.env.GCP_PROJECT_ID);
