"""Pydantic request/response models for the API."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class PredictRequest(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded image (raw or data-URL prefixed)")


class PredictResponse(BaseModel):
    face_found: bool
    emotion: str | None = None
    confidence: float | None = None
    all_scores: dict[str, float] | None = None
    bbox: dict | None = None
    heatmap_base64: str | None = None


class ChildCreate(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100)


class ChildResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
    created_at: datetime


class SessionCreate(BaseModel):
    child_id: int
    mode: Literal["quiz", "practice"]


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    child_id: int
    mode: str
    started_at: datetime
    ended_at: datetime | None = None


class AttemptCreate(BaseModel):
    target_emotion: str | None = None
    predicted_emotion: str | None = None
    child_choice: str | None = None
    confidence: float | None = None
    correct: bool | None = None
    source: Literal["quiz", "show_me", "webcam"]


class AttemptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    target_emotion: str | None = None
    predicted_emotion: str | None = None
    child_choice: str | None = None
    confidence: float | None = None
    correct: bool | None = None
    source: str
    created_at: datetime


class NextExerciseResponse(BaseModel):
    emotion: str
    mode: str


class EmotionAccuracy(BaseModel):
    emotion: str
    correct: int
    total: int
    accuracy: float | None = None


class SourceAccuracy(BaseModel):
    per_emotion: list[EmotionAccuracy]


class DailyTrendPoint(BaseModel):
    date: str
    quiz_accuracy: float | None = None
    practice_accuracy: float | None = None
    overall_accuracy: float | None = None
    quiz_total: int
    practice_total: int


class SessionTrendPoint(BaseModel):
    session_id: int
    mode: str
    started_at: str
    accuracy: float
    total: int


class RecentAttempt(BaseModel):
    id: int
    emotion: str | None
    correct: bool
    source: str
    timestamp: str


class DashboardResponse(BaseModel):
    child_id: int
    display_name: str
    quiz: SourceAccuracy
    practice: SourceAccuracy
    daily_trend: list[DailyTrendPoint]
    session_trend: list[SessionTrendPoint]
    recent_attempts: list[RecentAttempt]
