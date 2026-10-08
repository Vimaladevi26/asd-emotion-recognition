"""SQLite / SQLAlchemy 2.0 engine and session helpers."""

from __future__ import annotations

import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./asd_sessions.db")

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app import models as _models  # noqa: F401
    from sqlalchemy import inspect, text

    Base.metadata.create_all(bind=engine)

    # Lightweight SQLite column migrations for existing local DBs.
    inspector = inspect(engine)
    if "children" not in inspector.get_table_names():
        return

    existing_children = {column["name"] for column in inspector.get_columns("children")}
    with engine.begin() as connection:
        if "focus_emotions" not in existing_children:
            connection.execute(text("ALTER TABLE children ADD COLUMN focus_emotions VARCHAR(200)"))
        if "is_active" not in existing_children:
            connection.execute(text("ALTER TABLE children ADD COLUMN is_active BOOLEAN DEFAULT 1"))

    if "users" in inspector.get_table_names():
        existing_users = {column["name"] for column in inspector.get_columns("users")}
        with engine.begin() as connection:
            if "password_plain" not in existing_users:
                connection.execute(text("ALTER TABLE users ADD COLUMN password_plain VARCHAR(80)"))
