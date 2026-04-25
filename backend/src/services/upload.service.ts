// ─── Image upload service — Cloud Storage ───────────────────────────────────
import { storage, BUCKET_NAME } from "../config/storage";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

/**
 * Upload an image buffer to Cloud Storage.
 * Auto-resizes and converts to WebP for performance.
 * Returns the public URL.
 */
export async function uploadPotholeImage(
  imageBuffer: Buffer,
  potholeId: string,
  mimeType: string
): Promise<string> {
  // Resize and convert to WebP
  const processed = await sharp(imageBuffer)
    .resize(1200, 900, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const filename = `potholes/${potholeId}/${uuidv4()}.webp`;
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(filename);

  await file.save(processed, {
    contentType: "image/webp",
    metadata: {
      cacheControl: "public, max-age=31536000",
    },
    public: true,
  });

  const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;
  console.log(`📸 Image uploaded: ${publicUrl}`);
  return publicUrl;
}

/**
 * Get a base64 representation of an image buffer for Gemini API calls.
 */
export function imageToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}
