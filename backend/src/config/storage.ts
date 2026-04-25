// ─── Google Cloud Storage client ────────────────────────────────────────────
import { Storage } from "@google-cloud/storage";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const serviceAccountPath = path.resolve(
  process.env.GOOGLE_APPLICATION_CREDENTIALS || "./service-account.json"
);

export const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID || "rentatulya6000",
  keyFilename: serviceAccountPath,
});

export const BUCKET_NAME = process.env.GCS_BUCKET_NAME || "rentatulya6000-pothole-images";

// Ensure bucket exists (called once at startup)
export async function ensureBucket(): Promise<void> {
  try {
    const [exists] = await storage.bucket(BUCKET_NAME).exists();
    if (!exists) {
      await storage.createBucket(BUCKET_NAME, {
        location: process.env.GCP_REGION || "asia-south1",
        storageClass: "STANDARD",
      });
      console.log(`✅ Created GCS bucket: ${BUCKET_NAME}`);

      // Make bucket publicly readable for serving images
      await storage.bucket(BUCKET_NAME).makePublic();
    } else {
      console.log(`✅ GCS bucket exists: ${BUCKET_NAME}`);
    }
  } catch (err: any) {
    // If we can't create/access bucket, log but don't crash — images will fail gracefully
    console.warn(`⚠️ GCS bucket setup warning: ${err.message}`);
  }
}

console.log("✅ Cloud Storage client initialized");
