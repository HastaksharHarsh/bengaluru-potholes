"""
Pothole Detection FastAPI Server
Loads YOLOv8n model and exposes /detect endpoint for image-based pothole inference.
"""

import os
import io
import logging
from pathlib import Path

import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------
FINE_TUNED_WEIGHTS = Path("runs/detect/pothole_v1/weights/best.pt")
DEFAULT_WEIGHTS = "yolov8n.pt"

model_path = str(FINE_TUNED_WEIGHTS) if FINE_TUNED_WEIGHTS.exists() else DEFAULT_WEIGHTS
logger.info("Loading YOLO model from: %s", model_path)
model = YOLO(model_path)
logger.info("Model loaded successfully.")

# Severity mapping: class-id → label (matches dataset classes)
SEVERITY_MAP = {0: "minor_pothole", 1: "medium_pothole", 2: "major_pothole"}

# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Pothole Detection API",
    version="1.0.0",
    description="YOLOv8-based pothole detection micro-service.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    """Simple liveness check."""
    return {"status": "ok"}


@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    """
    Accept an image upload, run YOLOv8 inference, and return structured
    detection results including severity labels and scores.
    """
    # --- validate content type ---
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded file is not an image (got {file.content_type}).",
        )

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read image: {exc}")

    img_w, img_h = image.size
    image_area = img_w * img_h

    # --- run inference ---
    try:
        results = model.predict(source=image, verbose=False)
    except Exception as exc:
        logger.exception("Inference failed")
        raise HTTPException(status_code=500, detail=f"Inference error: {exc}")

    # --- build detections list ---
    detections = []
    for result in results:
        boxes = result.boxes
        if boxes is None:
            continue
        for i in range(len(boxes)):
            xyxy = boxes.xyxy[i].cpu().numpy().tolist()  # [x1, y1, x2, y2]
            conf = float(boxes.conf[i].cpu().numpy())
            cls_id = int(boxes.cls[i].cpu().numpy())

            x1, y1, x2, y2 = xyxy
            box_w = x2 - x1
            box_h = y2 - y1
            area_px = box_w * box_h
            area_ratio = area_px / image_area if image_area > 0 else 0.0

            severity_score = min(area_ratio * conf, 1.0)
            
            # --- Dynamic Severity Re-Classification ---
            # Instead of relying entirely on the YOLO classification, 
            # we classify major/medium/minor based on the actual severity score
            if severity_score >= 0.05:
                severity_label = "major_pothole"
            elif severity_score >= 0.015:
                severity_label = "medium_pothole"
            else:
                severity_label = "minor_pothole"

            detections.append(
                {
                    "bbox": {
                        "x1": round(x1, 2),
                        "y1": round(y1, 2),
                        "x2": round(x2, 2),
                        "y2": round(y2, 2),
                    },
                    "confidence": round(conf, 4),
                    "severity": severity_label,
                    "severity_score": round(severity_score, 6),
                    "area_px": round(area_px, 2),
                }
            )

    # Sort detections by severity score (highest first)
    detections = sorted(detections, key=lambda x: x["severity_score"], reverse=True)

    return {
        "image_size": {"width": img_w, "height": img_h},
        "pothole_count": len(detections),
        "detections": detections,
    }


# ---------------------------------------------------------------------------
# Entry-point (for `python server.py`)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)
