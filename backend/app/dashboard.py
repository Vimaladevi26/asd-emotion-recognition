"""Dashboard aggregations from scored quiz and show-me attempts."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.ml.model import EMOTION_LABELS
from app.models import Attempt, Child, TherapySession

PROMPT_EMOTIONS: tuple[str, ...] = tuple(label for label in EMOTION_LABELS if label != "disgust")
QUIZ_SOURCE = "quiz"
PRACTICE_SOURCE = "show_me"
RECENT_LIMIT = 10


def _scored_attempts(db: Session, child_id: int) -> list[Attempt]:
    statement = (
        select(Attempt)
        .join(TherapySession, Attempt.session_id == TherapySession.id)
        .where(TherapySession.child_id == child_id)
        .where(Attempt.correct.is_not(None))
        .where(Attempt.target_emotion.is_not(None))
        .where(Attempt.source.in_((QUIZ_SOURCE, PRACTICE_SOURCE)))
        .order_by(Attempt.created_at.asc())
    )
    return list(db.scalars(statement))


def _attempt_day(created_at: datetime) -> date:
    if created_at.tzinfo is not None:
        return created_at.date()
    return created_at.date()


def _per_emotion(attempts: list[Attempt], source: str) -> list[dict]:
    rows: list[dict] = []
    subset = [item for item in attempts if item.source == source]
    for emotion in PROMPT_EMOTIONS:
        matches = [item for item in subset if item.target_emotion == emotion]
        total = len(matches)
        correct = sum(1 for item in matches if item.correct)
        accuracy = (correct / total) if total else None
        rows.append(
            {
                "emotion": emotion,
                "correct": correct,
                "total": total,
                "accuracy": accuracy,
            }
        )
    return rows


def _daily_trend(attempts: list[Attempt]) -> list[dict]:
    buckets: dict[date, dict[str, list[bool]]] = defaultdict(
        lambda: {QUIZ_SOURCE: [], PRACTICE_SOURCE: []}
    )
    for attempt in attempts:
        buckets[_attempt_day(attempt.created_at)][attempt.source].append(bool(attempt.correct))

    trend: list[dict] = []
    for day in sorted(buckets):
        quiz = buckets[day][QUIZ_SOURCE]
        practice = buckets[day][PRACTICE_SOURCE]
        quiz_total = len(quiz)
        practice_total = len(practice)
        overall = quiz + practice
        trend.append(
            {
                "date": day.isoformat(),
                "quiz_accuracy": (sum(quiz) / quiz_total) if quiz_total else None,
                "practice_accuracy": (sum(practice) / practice_total) if practice_total else None,
                "overall_accuracy": (sum(overall) / len(overall)) if overall else None,
                "quiz_total": quiz_total,
                "practice_total": practice_total,
            }
        )
    return trend


def _session_trend(db: Session, child_id: int) -> list[dict]:
    sessions = list(
        db.scalars(
            select(TherapySession)
            .where(TherapySession.child_id == child_id)
            .options(selectinload(TherapySession.attempts))
            .order_by(TherapySession.started_at.asc())
        )
    )
    rows: list[dict] = []
    for session in sessions:
        scored = [
            attempt
            for attempt in session.attempts
            if attempt.correct is not None and attempt.target_emotion is not None
        ]
        if not scored:
            continue
        total = len(scored)
        correct = sum(1 for attempt in scored if attempt.correct)
        rows.append(
            {
                "session_id": session.id,
                "mode": session.mode,
                "started_at": session.started_at.isoformat(),
                "accuracy": correct / total,
                "total": total,
            }
        )
    return rows


def build_dashboard(db: Session, child_id: int) -> dict | None:
    child = db.get(Child, child_id)
    if child is None:
        return None

    attempts = _scored_attempts(db, child_id)
    recent = list(reversed(attempts[-RECENT_LIMIT:]))

    return {
        "child_id": child.id,
        "display_name": child.display_name,
        "quiz": {"per_emotion": _per_emotion(attempts, QUIZ_SOURCE)},
        "practice": {"per_emotion": _per_emotion(attempts, PRACTICE_SOURCE)},
        "daily_trend": _daily_trend(attempts),
        "session_trend": _session_trend(db, child_id),
        "recent_attempts": [
            {
                "id": attempt.id,
                "emotion": attempt.target_emotion,
                "correct": bool(attempt.correct),
                "source": attempt.source,
                "timestamp": attempt.created_at.isoformat(),
            }
            for attempt in recent
        ],
    }
