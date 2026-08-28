"""Tests for the raw-image emotion prediction pipeline."""

from PIL import Image

from app.ml.model import EMOTION_LABELS
from app.ml.pipeline import predict_emotion_from_raw_image, predict_emotion_from_raw_pil
from app.ml.vit_model import predict_emotion_vit

from tests.conftest import CONFUSION_MATRIX, HAPPY_FACE_CROP


def test_pipeline_no_face_returns_structured_none_fields():
    result = predict_emotion_from_raw_image(str(CONFUSION_MATRIX))
    assert result["face_found"] is False
    assert result["emotion"] is None
    assert result["confidence"] is None
    assert result["all_scores"] is None
    assert result["bbox"] is None


def test_predict_emotion_vit_returns_valid_shape_and_scores():
    image = Image.open(HAPPY_FACE_CROP)
    result = predict_emotion_vit(image)

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


def test_pipeline_happy_face_crop_predicts_happy_with_high_confidence():
    """Golden check: ViT should recognize a known happy face crop reliably."""
    result = predict_emotion_from_raw_pil(Image.open(HAPPY_FACE_CROP))

    assert result["face_found"] is True
    assert result["emotion"] == "happy"
    assert result["confidence"] >= 0.9
    assert result["bbox"] is not None
