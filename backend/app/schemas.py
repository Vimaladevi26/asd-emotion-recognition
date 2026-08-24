"""Pydantic request/response models for the API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded image (raw or data-URL prefixed)")


class PredictResponse(BaseModel):
    face_found: bool
    emotion: str | None = None
    confidence: float | None = None
    all_scores: dict[str, float] | None = None
    bbox: dict | None = None
