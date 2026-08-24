"""Tests for face detection on known inputs."""

from app.ml.face_detect import detect_and_crop_face

from tests.conftest import CONFUSION_MATRIX


def test_no_face_in_confusion_matrix():
    result = detect_and_crop_face(CONFUSION_MATRIX)
    assert result["face_found"] is False
    assert result["bbox"] is None
    assert result["cropped_face"] is None
