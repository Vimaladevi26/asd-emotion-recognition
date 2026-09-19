"""Session and attempt API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Attempt, Child, TherapySession
from app.schemas import AttemptCreate, AttemptResponse, SessionCreate, SessionResponse

router = APIRouter(tags=["sessions"])


@router.post("/sessions", response_model=SessionResponse)
def create_session(payload: SessionCreate, db: Session = Depends(get_db)) -> TherapySession:
    child = db.get(Child, payload.child_id)
    if child is None:
        raise HTTPException(status_code=404, detail="Child not found.")

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
