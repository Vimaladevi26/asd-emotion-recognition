"""Password hashing and bearer-token helpers."""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AuthToken, User

_PBKDF2_ITERS = 120_000
_TOKEN_TTL = timedelta(days=7)
_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        _PBKDF2_ITERS,
    ).hex()
    return f"pbkdf2_sha256${_PBKDF2_ITERS}${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, iters_s, salt, digest = stored.split("$", 3)
        if scheme != "pbkdf2_sha256":
            return False
        iters = int(iters_s)
    except ValueError:
        return False

    check = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iters,
    ).hex()
    return hmac.compare_digest(check, digest)


def issue_token(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    row = AuthToken(
        token=token,
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + _TOKEN_TTL,
    )
    db.add(row)
    db.commit()
    return token


def get_user_by_token(db: Session, token: str) -> User | None:
    row = db.scalar(select(AuthToken).where(AuthToken.token == token))
    if row is None:
        return None
    expires = row.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        return None
    return db.get(User, row.user_id)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Login required.",
        )
    user = get_user_by_token(db, credentials.credentials)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
        )
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user


def seed_admin(db: Session) -> None:
    existing = db.scalar(select(User).where(User.username == "admin"))
    if existing is not None:
        return
    admin = User(
        username="admin",
        password_hash=hash_password("admin123"),
        role="admin",
        display_name="Admin",
        child_id=None,
    )
    db.add(admin)
    db.commit()
