"""Child profile API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Child
from app.schemas import ChildCreate, ChildResponse

router = APIRouter(tags=["children"])


@router.get("/children", response_model=list[ChildResponse])
def list_children(db: Session = Depends(get_db)) -> list[Child]:
    return list(db.scalars(select(Child).order_by(Child.id)))


@router.post("/children", response_model=ChildResponse)
def create_child(payload: ChildCreate, db: Session = Depends(get_db)) -> Child:
    name = payload.display_name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="display_name cannot be empty.")

    child = Child(display_name=name)
    db.add(child)
    db.commit()
    db.refresh(child)
    return child
