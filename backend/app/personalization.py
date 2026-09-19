"""Rule-based next-exercise picker from scored quiz and show-me attempts."""

from __future__ import annotations

import random
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ml.model import EMOTION_LABELS
from app.models import Attempt, Child, TherapySession

PROMPT_EMOTIONS: tuple[str, ...] = tuple(label for label in EMOTION_LABELS if label != "disgust")
SCORED_SOURCES: tuple[str, ...] = ("quiz", "show_me")
LAST_N_PER_EMOTION = 20
MIN_SAMPLES = 3
UNKNOWN_PRIOR = 0.5


def compute_emotion_weights(
    attempts: Sequence[Attempt],
    emotions: Sequence[str] = PROMPT_EMOTIONS,
) -> dict[str, float]:
    """
    Weight = 1 - accuracy over the last N scored attempts per emotion.

    Fewer than MIN_SAMPLES attempts uses UNKNOWN_PRIOR (0.5), so weight is 0.5.
    """
    by_emotion: dict[str, list[Attempt]] = {emotion: [] for emotion in emotions}
    for attempt in attempts:
        target = attempt.target_emotion
        if target in by_emotion and len(by_emotion[target]) < LAST_N_PER_EMOTION:
            by_emotion[target].append(attempt)

    weights: dict[str, float] = {}
    for emotion in emotions:
        samples = by_emotion[emotion]
        if len(samples) < MIN_SAMPLES:
            accuracy = UNKNOWN_PRIOR
        else:
            accuracy = sum(1 for item in samples if item.correct) / len(samples)
        weights[emotion] = 1.0 - accuracy
    return weights


def pick_weighted_emotion(
    weights: dict[str, float],
    rng: random.Random | None = None,
) -> str:
    picker = rng or random.Random()
    emotions = list(weights)
    totals = [max(weight, 0.0) for weight in weights.values()]
    mass = sum(totals)
    if mass <= 0:
        return picker.choice(emotions)

    draw = picker.random() * mass
    cumulative = 0.0
    for emotion, weight in zip(emotions, totals, strict=True):
        cumulative += weight
        if draw <= cumulative:
            return emotion
    return emotions[-1]


def scored_attempts_for_child(db: Session, child_id: int) -> list[Attempt]:
    statement = (
        select(Attempt)
        .join(TherapySession, Attempt.session_id == TherapySession.id)
        .where(TherapySession.child_id == child_id)
        .where(Attempt.source.in_(SCORED_SOURCES))
        .where(Attempt.correct.is_not(None))
        .where(Attempt.target_emotion.is_not(None))
        .order_by(Attempt.created_at.desc())
    )
    return list(db.scalars(statement))


def next_exercise_for_child(db: Session, child_id: int) -> dict[str, str] | None:
    child = db.get(Child, child_id)
    if child is None:
        return None

    attempts = scored_attempts_for_child(db, child_id)
    weights = compute_emotion_weights(attempts)
    emotion = pick_weighted_emotion(weights)
    return {"emotion": emotion, "mode": "practice"}
