"""Next-exercise personalization routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.personalization import next_exercise_for_child
from app.schemas import NextExerciseResponse

router = APIRouter(tags=["personalization"])


@router.get("/next-exercise/{child_id}", response_model=NextExerciseResponse)
def get_next_exercise(child_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    result = next_exercise_for_child(db, child_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Child not found.")
    return result
