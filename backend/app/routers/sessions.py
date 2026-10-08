"""Session and attempt API routes."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Attempt, Child, TherapySession
from app.schemas import (
    AttemptCreate,
    AttemptResponse,
    SessionCreate,
    SessionResponse,
    SessionSummaryEmotion,
    SessionSummaryResponse,
)

router = APIRouter(tags=["sessions"])


def _build_session_summary(session: TherapySession, attempts: list[Attempt]) -> SessionSummaryResponse:
    scored = [attempt for attempt in attempts if attempt.correct is not None]
    correct = sum(1 for attempt in scored if attempt.correct)
    total = len(scored)
    by_emotion_map: dict[str, list[bool]] = {}
    for attempt in scored:
        emotion = attempt.target_emotion or "unknown"
        by_emotion_map.setdefault(emotion, []).append(bool(attempt.correct))

    by_emotion: list[SessionSummaryEmotion] = []
    hardest: str | None = None
    hardest_acc = 2.0
    for emotion, results in sorted(by_emotion_map.items()):
        emotion_total = len(results)
        emotion_correct = sum(1 for value in results if value)
        by_emotion.append(
            SessionSummaryEmotion(
                emotion=emotion,
                correct=emotion_correct,
                total=emotion_total,
            )
        )
        accuracy = emotion_correct / emotion_total if emotion_total else 1.0
        if emotion_total > 0 and accuracy < hardest_acc:
            hardest_acc = accuracy
            hardest = emotion

    return SessionSummaryResponse(
        session_id=session.id,
        child_id=session.child_id,
        mode=session.mode,
        started_at=session.started_at,
        ended_at=session.ended_at,
        total=total,
        correct=correct,
        accuracy=(correct / total) if total else None,
        by_emotion=by_emotion,
        hardest_emotion=hardest,
    )


@router.post("/sessions", response_model=SessionResponse)
def create_session(payload: SessionCreate, db: Session = Depends(get_db)) -> TherapySession:
    child = db.get(Child, payload.child_id)
    if child is None:
        raise HTTPException(status_code=404, detail="Child not found.")
    if child.is_active is False:
        raise HTTPException(status_code=400, detail="Child account is archived.")

    session = TherapySession(child_id=payload.child_id, mode=payload.mode)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/sessions/{session_id}/attempts", response_model=AttemptResponse)
def create_attempt(
    session_id: int,
    payload: AttemptCreate,
    db: Session = Depends(get_db),
) -> Attempt:
    session = db.get(TherapySession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    attempt = Attempt(session_id=session_id, **payload.model_dump())
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


@router.post("/sessions/{session_id}/end", response_model=SessionSummaryResponse)
def end_session(session_id: int, db: Session = Depends(get_db)) -> SessionSummaryResponse:
    session = db.get(TherapySession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    if session.ended_at is None:
        session.ended_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(session)

    attempts = list(
        db.scalars(select(Attempt).where(Attempt.session_id == session_id).order_by(Attempt.created_at))
    )
    return _build_session_summary(session, attempts)


@router.get("/sessions/{session_id}/summary", response_model=SessionSummaryResponse)
def get_session_summary(session_id: int, db: Session = Depends(get_db)) -> SessionSummaryResponse:
    session = db.get(TherapySession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    attempts = list(
        db.scalars(select(Attempt).where(Attempt.session_id == session_id).order_by(Attempt.created_at))
    )
    return _build_session_summary(session, attempts)
