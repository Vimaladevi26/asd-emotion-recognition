"""API tests for child / session / attempt tracking."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth import seed_admin
from app.db import Base, get_db
from app.main import app
from app.models import Attempt, AuthToken, Child, TherapySession, User  # noqa: F401

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(bind=engine)

with TestingSessionLocal() as _seed_db:
    seed_admin(_seed_db)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db
client = TestClient(app)

_child_counter = 0


def _admin_headers() -> dict[str, str]:
    response = client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def _create_child(display_name: str = "Asha") -> dict:
    global _child_counter
    _child_counter += 1
    headers = _admin_headers()
    response = client.post(
        "/children",
        headers=headers,
        json={
            "display_name": display_name,
            "username": f"child{_child_counter}",
            "password": "pass1234",
        },
    )
    assert response.status_code == 200
    return response.json()


def test_create_child_session_and_quiz_attempt():
    child = _create_child("Asha")
    assert child["display_name"] == "Asha"
    assert "id" in child
    assert child["username"]

    session_response = client.post(
        "/sessions",
        json={"child_id": child["id"], "mode": "quiz"},
    )
    assert session_response.status_code == 200
    session = session_response.json()
    assert session["child_id"] == child["id"]
    assert session["mode"] == "quiz"

    attempt_response = client.post(
        f"/sessions/{session['id']}/attempts",
        json={
            "target_emotion": "happy",
            "child_choice": "sad",
            "predicted_emotion": None,
            "confidence": None,
            "correct": False,
            "source": "quiz",
        },
    )
    assert attempt_response.status_code == 200
    attempt = attempt_response.json()
    assert attempt["session_id"] == session["id"]
    assert attempt["target_emotion"] == "happy"
    assert attempt["child_choice"] == "sad"
    assert attempt["correct"] is False
    assert attempt["source"] == "quiz"


def test_create_session_unknown_child_returns_404():
    response = client.post("/sessions", json={"child_id": 99999, "mode": "quiz"})
    assert response.status_code == 404


def test_next_exercise_unknown_child_returns_404():
    response = client.get("/next-exercise/99999")
    assert response.status_code == 404


def test_next_exercise_returns_prompt_emotion():
    child = _create_child("Asha")
    response = client.get(f"/next-exercise/{child['id']}")
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "practice"
    assert body["emotion"] in {"angry", "fear", "happy", "neutral", "sad", "surprise"}


def test_list_children_includes_created_child():
    headers = _admin_headers()
    created = _create_child("Dashboard Kid")
    listing = client.get("/children", headers=headers)
    assert listing.status_code == 200
    ids = {row["id"] for row in listing.json()}
    assert created["id"] in ids


def test_dashboard_unknown_child_returns_404():
    headers = _admin_headers()
    response = client.get("/dashboard/99999", headers=headers)
    assert response.status_code == 404


def test_dashboard_splits_quiz_and_practice_accuracy():
    headers = _admin_headers()
    child = _create_child("Asha")
    quiz_session = client.post(
        "/sessions", json={"child_id": child["id"], "mode": "quiz"}
    ).json()
    practice_session = client.post(
        "/sessions", json={"child_id": child["id"], "mode": "practice"}
    ).json()

    client.post(
        f"/sessions/{quiz_session['id']}/attempts",
        json={
            "target_emotion": "happy",
            "child_choice": "happy",
            "correct": True,
            "source": "quiz",
        },
    )
    client.post(
        f"/sessions/{quiz_session['id']}/attempts",
        json={
            "target_emotion": "sad",
            "child_choice": "angry",
            "correct": False,
            "source": "quiz",
        },
    )
    client.post(
        f"/sessions/{practice_session['id']}/attempts",
        json={
            "target_emotion": "fear",
            "predicted_emotion": "fear",
            "correct": True,
            "source": "show_me",
        },
    )

    response = client.get(f"/dashboard/{child['id']}", headers=headers)
    assert response.status_code == 200
    body = response.json()
    quiz_happy = next(row for row in body["quiz"]["per_emotion"] if row["emotion"] == "happy")
    quiz_sad = next(row for row in body["quiz"]["per_emotion"] if row["emotion"] == "sad")
    practice_fear = next(
        row for row in body["practice"]["per_emotion"] if row["emotion"] == "fear"
    )
    assert quiz_happy["correct"] == 1 and quiz_happy["total"] == 1
    assert quiz_sad["correct"] == 0 and quiz_sad["total"] == 1
    assert practice_fear["correct"] == 1 and practice_fear["total"] == 1
    assert len(body["recent_attempts"]) == 3
    assert body["daily_trend"]
    assert body["session_trend"]


def test_admin_and_child_login():
    child = _create_child("Login Kid")
    child_login = client.post(
        "/auth/login",
        json={"username": child["username"], "password": "pass1234"},
    )
    assert child_login.status_code == 200
    body = child_login.json()
    assert body["role"] == "child"
    assert body["child_id"] == child["id"]
