"""Therapist/parent progress dashboard routes."""

from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_admin
from app.dashboard import build_dashboard
from app.db import get_db
from app.models import Attempt, Child, TherapySession, User
from app.schemas import DashboardResponse

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/{child_id}", response_model=DashboardResponse)
def get_dashboard(
    child_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if user.role == "child" and user.child_id != child_id:
        raise HTTPException(status_code=403, detail="Cannot view another child's progress.")
    payload = build_dashboard(db, child_id)
    if payload is None:
        raise HTTPException(status_code=404, detail="Child not found.")
    return payload


@router.get("/dashboard/{child_id}/export.csv")
def export_dashboard_csv(
    child_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> StreamingResponse:
    child = db.get(Child, child_id)
    if child is None:
        raise HTTPException(status_code=404, detail="Child not found.")

    attempts = list(
        db.scalars(
            select(Attempt)
            .join(TherapySession, Attempt.session_id == TherapySession.id)
            .where(TherapySession.child_id == child_id)
            .order_by(Attempt.created_at.desc())
        )
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "attempt_id",
            "session_id",
            "source",
            "target_emotion",
            "child_choice",
            "predicted_emotion",
            "correct",
            "confidence",
            "created_at",
            "child_id",
            "child_name",
        ]
    )
    for attempt in attempts:
        writer.writerow(
            [
                attempt.id,
                attempt.session_id,
                attempt.source,
                attempt.target_emotion or "",
                attempt.child_choice or "",
                attempt.predicted_emotion or "",
                "" if attempt.correct is None else int(attempt.correct),
                "" if attempt.confidence is None else attempt.confidence,
                attempt.created_at.isoformat() if attempt.created_at else "",
                child_id,
                child.display_name,
            ]
        )

    buffer.seek(0)
    filename = f"child-{child_id}-progress.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
