"""Login and session routes for admin and child users."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import (
    get_current_user,
    issue_token,
    verify_password,
)
from app.db import get_db
from app.models import AuthToken, User
from app.schemas import LoginRequest, LoginResponse, MeResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    username = payload.username.strip().lower()
    user = db.scalar(select(User).where(User.username == username))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    token = issue_token(db, user)
    return LoginResponse(
        token=token,
        role=user.role,  # type: ignore[arg-type]
        user_id=user.id,
        display_name=user.display_name,
        child_id=user.child_id,
        username=user.username,
    )


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(
        role=user.role,  # type: ignore[arg-type]
        user_id=user.id,
        display_name=user.display_name,
        child_id=user.child_id,
        username=user.username,
    )


@router.post("/logout")
def logout(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    tokens = list(db.scalars(select(AuthToken).where(AuthToken.user_id == user.id)))
    for row in tokens:
        db.delete(row)
    db.commit()
    return {"status": "ok"}
