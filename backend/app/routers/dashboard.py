"""Therapist/parent progress dashboard routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dashboard import build_dashboard
from app.db import get_db
from app.schemas import DashboardResponse

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/{child_id}", response_model=DashboardResponse)
def get_dashboard(child_id: int, db: Session = Depends(get_db)) -> dict:
    payload = build_dashboard(db, child_id)
    if payload is None:
        raise HTTPException(status_code=404, detail="Child not found.")
    return payload
