"""Child profile API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import get_current_user, hash_password, require_admin
from app.db import get_db
from app.ml.model import EMOTION_LABELS
from app.models import Attempt, Child, TherapySession, User
from app.schemas import ChildCreate, ChildResponse, ChildUpdate, SessionResponse

router = APIRouter(tags=["children"])

ALLOWED_FOCUS = {label for label in EMOTION_LABELS if label != "disgust"}


def _normalize_focus(emotions: list[str] | None) -> str | None:
    if emotions is None:
        return None
    cleaned: list[str] = []
    for emotion in emotions:
        value = emotion.strip().lower()
        if not value:
            continue
        if value not in ALLOWED_FOCUS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported focus emotion: {value}",
            )
        if value not in cleaned:
            cleaned.append(value)
    return ",".join(cleaned) if cleaned else None


def _child_stats(db: Session, child_id: int) -> tuple[int, int]:
    session_count = db.scalar(
        select(func.count()).select_from(TherapySession).where(TherapySession.child_id == child_id)
    )
    attempt_count = db.scalar(
        select(func.count())
        .select_from(Attempt)
        .join(TherapySession, Attempt.session_id == TherapySession.id)
        .where(TherapySession.child_id == child_id)
    )
    return int(session_count or 0), int(attempt_count or 0)


def _child_response(
    db: Session,
    child: Child,
    *,
    username: str | None = None,
    include_password: bool = False,
) -> ChildResponse:
    if username is None and child.user is not None:
        username = child.user.username
    session_count, attempt_count = _child_stats(db, child.id)
    password = None
    if include_password and child.user is not None:
        password = child.user.password_plain
    return ChildResponse(
        id=child.id,
        display_name=child.display_name,
        created_at=child.created_at,
        username=username,
        password=password,
        focus_emotions=child.focus_list(),
        is_active=bool(child.is_active if child.is_active is not None else True),
        session_count=session_count,
        attempt_count=attempt_count,
    )


@router.get("/children", response_model=list[ChildResponse])
def list_children(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    include_inactive: bool = False,
) -> list[ChildResponse]:
    if user.role == "child":
        if user.child_id is None:
            return []
        child = db.get(Child, user.child_id)
        return [_child_response(db, child)] if child else []

    statement = select(Child).order_by(Child.display_name.asc(), Child.id.asc())
    children = list(db.scalars(statement))
    if not include_inactive:
        children = [child for child in children if child.is_active is not False]
    return [_child_response(db, child, include_password=True) for child in children]


@router.post("/children", response_model=ChildResponse)
def create_child(
    payload: ChildCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ChildResponse:
    name = payload.display_name.strip()
    username = payload.username.strip().lower()
    if not name:
        raise HTTPException(status_code=400, detail="display_name cannot be empty.")
    if not username:
        raise HTTPException(status_code=400, detail="username cannot be empty.")

    taken = db.scalar(select(User).where(User.username == username))
    if taken is not None:
        raise HTTPException(status_code=400, detail="Username already taken.")

    child = Child(
        display_name=name,
        focus_emotions=_normalize_focus(payload.focus_emotions),
        is_active=True,
    )
    db.add(child)
    db.flush()

    account = User(
        username=username,
        password_hash=hash_password(payload.password),
        password_plain=payload.password,
        role="child",
        display_name=name,
        child_id=child.id,
    )
    db.add(account)
    db.commit()
    db.refresh(child)
    return _child_response(db, child, username=username, include_password=True)


@router.get("/children/{child_id}", response_model=ChildResponse)
def get_child(
    child_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ChildResponse:
    if user.role == "child" and user.child_id != child_id:
        raise HTTPException(status_code=403, detail="Cannot view another child.")
    child = db.get(Child, child_id)
    if child is None:
        raise HTTPException(status_code=404, detail="Child not found.")
    return _child_response(db, child, include_password=(user.role == "admin"))


@router.patch("/children/{child_id}", response_model=ChildResponse)
def update_child(
    child_id: int,
    payload: ChildUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ChildResponse:
    child = db.get(Child, child_id)
    if child is None:
        raise HTTPException(status_code=404, detail="Child not found.")

    if payload.display_name is not None:
        name = payload.display_name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="display_name cannot be empty.")
        child.display_name = name
        if child.user is not None:
            child.user.display_name = name

    if payload.focus_emotions is not None:
        child.focus_emotions = _normalize_focus(payload.focus_emotions)

    if payload.is_active is not None:
        child.is_active = payload.is_active

    if payload.password is not None:
        if child.user is None:
            raise HTTPException(status_code=400, detail="Child has no login account.")
        child.user.password_hash = hash_password(payload.password)
        child.user.password_plain = payload.password

    db.commit()
    db.refresh(child)
    return _child_response(db, child, include_password=True)


@router.delete("/children/{child_id}")
def delete_child(
    child_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> dict[str, str]:
    from app.models import AuthToken

    child = db.get(Child, child_id)
    if child is None:
        raise HTTPException(status_code=404, detail="Child not found.")

    sessions = list(db.scalars(select(TherapySession).where(TherapySession.child_id == child_id)))
    session_ids = [session.id for session in sessions]
    if session_ids:
        attempts = list(db.scalars(select(Attempt).where(Attempt.session_id.in_(session_ids))))
        for attempt in attempts:
            db.delete(attempt)
        for session in sessions:
            db.delete(session)

    account = child.user
    if account is not None:
        tokens = list(db.scalars(select(AuthToken).where(AuthToken.user_id == account.id)))
        for token in tokens:
            db.delete(token)
        db.delete(account)

    db.delete(child)
    db.commit()
    return {"status": "deleted"}


@router.get("/children/{child_id}/sessions", response_model=list[SessionResponse])
def list_child_sessions(
    child_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[TherapySession]:
    if user.role == "child" and user.child_id != child_id:
        raise HTTPException(status_code=403, detail="Cannot view another child's sessions.")
    if user.role == "admin" or user.child_id == child_id:
        child = db.get(Child, child_id)
        if child is None:
            raise HTTPException(status_code=404, detail="Child not found.")
        return list(
            db.scalars(
                select(TherapySession)
                .where(TherapySession.child_id == child_id)
                .order_by(TherapySession.started_at.desc())
            )
        )
    raise HTTPException(status_code=403, detail="Access denied.")
