"""FER2013 emotion classification inference (MobileNetV2 transfer learning)."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

# FER2013 CSV label order (emotion column 0–6). This is the standard Kaggle/dataset
# encoding and matches typical MobileNetV2 FER2013 training notebooks.
# NOTE: The checkpoint does not store class names; this order is inferred from
# FER2013 convention, not embedded metadata. If predictions look systematically
# wrong, verify against your Colab training notebook's label mapping.
EMOTION_LABELS: list[str] = [
    "angry",
    "disgust",
    "fear",
    "happy",
    "sad",
    "surprise",
    "neutral",
]

MODEL_PATH = Path(__file__).resolve().parent / "best_fer_model.pth"
INPUT_SIZE = (48, 48)

# ImageNet normalization (standard for MobileNetV2 transfer learning).
_IMAGENET_MEAN = [0.485, 0.456, 0.406]
_IMAGENET_STD = [0.229, 0.224, 0.225]

_TRANSFORM = transforms.Compose(
    [
        transforms.Resize(INPUT_SIZE),
        transforms.Grayscale(num_output_channels=3),
        transforms.ToTensor(),
        transforms.Normalize(mean=_IMAGENET_MEAN, std=_IMAGENET_STD),
    ]
)


def build_fer_model(num_classes: int = len(EMOTION_LABELS)) -> nn.Module:
    """Build MobileNetV2 with the same fine-tuning layout used in training."""
    model = models.mobilenet_v2(weights=None)

    for param in model.parameters():
        param.requires_grad = False

    model.classifier = nn.Sequential(
        nn.Dropout(p=0.2),
        nn.Linear(model.last_channel, num_classes),
    )

    for param in model.features[17].parameters():
        param.requires_grad = True
    for param in model.features[18].parameters():
        param.requires_grad = True
    for param in model.classifier.parameters():
        param.requires_grad = True

    return model


@lru_cache(maxsize=1)
def _load_model() -> nn.Module:
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(f"Model checkpoint not found: {MODEL_PATH}")

    model = build_fer_model()
    state_dict = torch.load(MODEL_PATH, map_location="cpu", weights_only=False)
    model.load_state_dict(state_dict, strict=True)
    model.eval()
    return model


def predict_emotion(image_path: str) -> dict:
    """
    Run inference on a single image file.

    Returns:
        {
            "emotion": str,
            "confidence": float,
            "all_scores": {label: probability, ...},
        }
    """
    path = Path(image_path)
    if not path.is_file():
        raise FileNotFoundError(f"Image not found: {path}")

    model = _load_model()
    image = Image.open(path)
    tensor = _TRANSFORM(image).unsqueeze(0)

    with torch.no_grad():
        logits = model(tensor)
        probabilities = torch.softmax(logits, dim=1).squeeze(0)

    scores = {
        label: float(probabilities[i].item())
        for i, label in enumerate(EMOTION_LABELS)
    }
    best_label = max(scores, key=scores.get)

    return {
        "emotion": best_label,
        "confidence": scores[best_label],
        "all_scores": scores,
    }
