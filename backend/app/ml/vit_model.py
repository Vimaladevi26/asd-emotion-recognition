"""ViT facial expression recognition (trpakov/vit-face-expression on Hugging Face)."""

from __future__ import annotations

from functools import lru_cache

import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForImageClassification

from app.ml.model import EMOTION_LABELS

MODEL_ID = "trpakov/vit-face-expression"

# Canonical labels used across the app (matches this model's id2label order).
_LABEL_ALIASES: dict[str, str] = {
    "anger": "angry",
    "angry": "angry",
    "disgust": "disgust",
    "disgusted": "disgust",
    "fear": "fear",
    "fearful": "fear",
    "happy": "happy",
    "happiness": "happy",
    "neutral": "neutral",
    "sad": "sad",
    "sadness": "sad",
    "surprise": "surprise",
    "surprised": "surprise",
}


def _normalize_label(raw_label: str) -> str:
    key = raw_label.strip().lower()
    if key in _LABEL_ALIASES:
        return _LABEL_ALIASES[key]
    raise ValueError(f"Unknown emotion label from ViT model: {raw_label!r}")


@lru_cache(maxsize=1)
def _load_vit_model() -> tuple[AutoImageProcessor, AutoModelForImageClassification]:
    processor = AutoImageProcessor.from_pretrained(MODEL_ID)
    model = AutoModelForImageClassification.from_pretrained(MODEL_ID)
    model.eval()
    return processor, model


def predict_emotion_vit(image: Image.Image) -> dict:
    """
    Run ViT inference on an in-memory PIL image (cropped face expected).

    Returns:
        {
            "emotion": str,
            "confidence": float,
            "all_scores": {label: probability, ...},
        }
    """
    processor, model = _load_vit_model()
    rgb_image = image.convert("RGB")

    inputs = processor(images=rgb_image, return_tensors="pt")

    with torch.no_grad():
        logits = model(**inputs).logits
        probabilities = torch.softmax(logits, dim=-1).squeeze(0)

    raw_scores: dict[str, float] = {}
    for idx, prob in enumerate(probabilities.tolist()):
        raw_label = model.config.id2label[idx]
        canonical = _normalize_label(raw_label)
        raw_scores[canonical] = raw_scores.get(canonical, 0.0) + float(prob)

    scores = {label: raw_scores.get(label, 0.0) for label in EMOTION_LABELS}
    best_label = max(scores, key=scores.get)

    return {
        "emotion": best_label,
        "confidence": scores[best_label],
        "all_scores": scores,
    }
