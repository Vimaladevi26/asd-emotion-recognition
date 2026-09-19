"""Tests for rule-based next-exercise weighting."""

from __future__ import annotations

from types import SimpleNamespace

from app.personalization import (
    MIN_SAMPLES,
    UNKNOWN_PRIOR,
    compute_emotion_weights,
    pick_weighted_emotion,
)


def _attempt(target: str, correct: bool) -> SimpleNamespace:
    return SimpleNamespace(target_emotion=target, correct=correct)


def test_unknown_emotions_use_mid_prior_weight():
    weights = compute_emotion_weights([])
    assert set(weights) == {"angry", "fear", "happy", "neutral", "sad", "surprise"}
    assert all(weight == 1.0 - UNKNOWN_PRIOR for weight in weights.values())


def test_below_min_samples_stays_unknown():
    attempts = [_attempt("fear", False)] * (MIN_SAMPLES - 1)
    weights = compute_emotion_weights(attempts)
    assert weights["fear"] == 1.0 - UNKNOWN_PRIOR


def test_low_accuracy_gets_higher_weight():
    fear_misses = [_attempt("fear", False)] * 10
    happy_hits = [_attempt("happy", True)] * 10
    weights = compute_emotion_weights(fear_misses + happy_hits)
    assert weights["fear"] == 1.0
    assert weights["happy"] == 0.0


def test_zero_weights_fall_back_to_uniform_choice():
    weights = {"happy": 0.0, "sad": 0.0}
    picked = {pick_weighted_emotion(weights) for _ in range(20)}
    assert picked <= {"happy", "sad"}
    assert len(picked) >= 1
