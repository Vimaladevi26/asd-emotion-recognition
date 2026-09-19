"""API tests for child / session / attempt tracking."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app
from app.models import Attempt, Child, TherapySession  # noqa: F401

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(bind=engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db
client = TestClient(app)


def test_create_child_session_and_quiz_attempt():
    child_response = client.post("/children", json={"display_name": "Asha"})
    assert child_response.status_code == 200
    child = child_response.json()
    assert child["display_name"] == "Asha"
    assert "id" in child

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
    child = client.post("/children", json={"display_name": "Asha"}).json()
    response = client.get(f"/next-exercise/{child['id']}")
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "practice"
    assert body["emotion"] in {"angry", "fear", "happy", "neutral", "sad", "surprise"}


def test_list_children_includes_created_child():
    created = client.post("/children", json={"display_name": "Dashboard Kid"}).json()
    listing = client.get("/children")
    assert listing.status_code == 200
    ids = {row["id"] for row in listing.json()}
    assert created["id"] in ids


def test_dashboard_unknown_child_returns_404():
    response = client.get("/dashboard/99999")
    assert response.status_code == 404


def test_dashboard_splits_quiz_and_practice_accuracy():
    child = client.post("/children", json={"display_name": "Asha"}).json()
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

    response = client.get(f"/dashboard/{child['id']}")
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
