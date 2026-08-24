"""Tests for the raw-image emotion prediction pipeline."""

from PIL import Image

from app.ml.model import EMOTION_LABELS, predict_emotion_from_pil
from app.ml.pipeline import predict_emotion_from_raw_image

from tests.conftest import CONFUSION_MATRIX, HAPPY_FACE_CROP


def test_pipeline_no_face_returns_structured_none_fields():
    result = predict_emotion_from_raw_image(str(CONFUSION_MATRIX))
    assert result["face_found"] is False
    assert result["emotion"] is None
    assert result["confidence"] is None
    assert result["all_scores"] is None
    assert result["bbox"] is None


def test_predict_emotion_from_pil_returns_valid_shape_and_scores():
    image = Image.open(HAPPY_FACE_CROP)
    result = predict_emotion_from_pil(image)

    assert set(result.keys()) == {"emotion", "confidence", "all_scores"}
    assert result["emotion"] in EMOTION_LABELS
    assert isinstance(result["confidence"], float)
    assert 0.0 <= result["confidence"] <= 1.0
    assert set(result["all_scores"].keys()) == set(EMOTION_LABELS)
    assert len(result["all_scores"]) == 7
    for label in EMOTION_LABELS:
        score = result["all_scores"][label]
        assert isinstance(score, float)
        assert 0.0 <= score <= 1.0
