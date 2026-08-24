"""End-to-end pipeline: raw image -> face detect/crop -> emotion prediction."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from app.ml.face_detect import detect_and_crop_face
from app.ml.model import predict_emotion_from_pil

NO_FACE_RESULT = {
    "face_found": False,
    "emotion": None,
    "confidence": None,
    "all_scores": None,
    "bbox": None,
}


def predict_emotion_from_raw_pil(image: Image.Image) -> dict:
    """
    Detect a face in a raw in-memory image, crop it, and predict the emotion.

    Returns a merged dict with face detection metadata and prediction scores.
    """
    detection = detect_and_crop_face(image)
    if not detection["face_found"]:
        return dict(NO_FACE_RESULT)

    prediction = predict_emotion_from_pil(detection["cropped_face"])

    return {
        "face_found": True,
        "bbox": detection["bbox"],
        "emotion": prediction["emotion"],
        "confidence": prediction["confidence"],
        "all_scores": prediction["all_scores"],
    }


def predict_emotion_from_raw_image(image_path: str) -> dict:
    """
    Detect a face in a raw photo file, crop it, and predict the emotion.

    Returns a merged dict with face detection metadata and prediction scores.
    """
    path = Path(image_path)
    if not path.is_file():
        raise FileNotFoundError(f"Image not found: {path}")

    return predict_emotion_from_raw_pil(Image.open(path))
