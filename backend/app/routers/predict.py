"""Emotion prediction API routes."""

from __future__ import annotations

import base64
import binascii
import io
import re

from fastapi import APIRouter, HTTPException
from PIL import Image, UnidentifiedImageError

from app.ml.pipeline import predict_emotion_from_raw_pil
from app.schemas import PredictRequest, PredictResponse

router = APIRouter(tags=["predict"])

_DATA_URL_PREFIX = re.compile(r"^data:image/[a-zA-Z+.-]+;base64,")


def _decode_base64_image(image_base64: str) -> Image.Image:
    payload = _DATA_URL_PREFIX.sub("", image_base64.strip())

    try:
        image_bytes = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(
            status_code=400,
            detail="Invalid base64 image data.",
        ) from exc

    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image data.")

    try:
        image = Image.open(io.BytesIO(image_bytes))
        return image.convert("RGB")
    except UnidentifiedImageError as exc:
        raise HTTPException(
            status_code=400,
            detail="Could not decode image bytes as a supported image format.",
        ) from exc


@router.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest) -> PredictResponse:
    image = _decode_base64_image(request.image_base64)
    result = predict_emotion_from_raw_pil(image)
    return PredictResponse(**result)
