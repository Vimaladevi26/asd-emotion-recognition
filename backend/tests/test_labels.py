"""Tests for model constants that must match Colab training."""

from app.ml.model import EMOTION_LABELS, INPUT_SIZE

EXPECTED_LABELS = [
    "angry",
    "disgust",
    "fear",
    "happy",
    "neutral",
    "sad",
    "surprise",
]


def test_emotion_labels_match_imagefolder_alphabetical_order():
    assert EMOTION_LABELS == EXPECTED_LABELS


def test_input_size_matches_colab_training():
    assert INPUT_SIZE == (224, 224)
