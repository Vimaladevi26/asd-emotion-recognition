"""OpenCV Haar cascade face detection and cropping."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Union

import cv2
import numpy as np
from PIL import Image

ImageInput = Union[str, Path, Image.Image]

PADDING_RATIO = 0.15
HAAR_SCALE_FACTOR = 1.1
HAAR_MIN_NEIGHBORS = 5
HAAR_MIN_SIZE = (30, 30)


@lru_cache(maxsize=1)
def _load_face_cascade() -> cv2.CascadeClassifier:
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    classifier = cv2.CascadeClassifier(cascade_path)
    if classifier.empty():
        raise RuntimeError(f"Failed to load Haar cascade from {cascade_path}")
    return classifier


def _to_pil_image(image_input: ImageInput) -> Image.Image:
    if isinstance(image_input, Image.Image):
        return image_input.convert("RGB")
    path = Path(image_input)
    if not path.is_file():
        raise FileNotFoundError(f"Image not found: {path}")
    return Image.open(path).convert("RGB")


def _pil_to_bgr_gray(pil_image: Image.Image) -> tuple[np.ndarray, np.ndarray]:
    rgb = np.array(pil_image)
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    return bgr, gray


def _apply_padding(
    x: int, y: int, width: int, height: int, image_width: int, image_height: int
) -> tuple[int, int, int, int]:
    pad_w = int(width * PADDING_RATIO)
    pad_h = int(height * PADDING_RATIO)

    x1 = max(0, x - pad_w)
    y1 = max(0, y - pad_h)
    x2 = min(image_width, x + width + pad_w)
    y2 = min(image_height, y + height + pad_h)

    return x1, y1, x2 - x1, y2 - y1


def detect_and_crop_face(image_input: ImageInput) -> dict:
    """
    Detect the largest face in an image and return a padded crop.

    Returns:
        {
            "face_found": bool,
            "bbox": {"x": int, "y": int, "width": int, "height": int} | None,
            "cropped_face": PIL.Image | None,
            "original_size": {"width": int, "height": int},
        }
    """
    pil_image = _to_pil_image(image_input)
    image_width, image_height = pil_image.size
    bgr, gray = _pil_to_bgr_gray(pil_image)

    classifier = _load_face_cascade()
    detections = classifier.detectMultiScale(
        gray,
        scaleFactor=HAAR_SCALE_FACTOR,
        minNeighbors=HAAR_MIN_NEIGHBORS,
        minSize=HAAR_MIN_SIZE,
    )

    if len(detections) == 0:
        return {
            "face_found": False,
            "bbox": None,
            "cropped_face": None,
            "original_size": {"width": image_width, "height": image_height},
        }

    x, y, width, height = max(detections, key=lambda box: box[2] * box[3])
    x, y, width, height = _apply_padding(
        int(x), int(y), int(width), int(height), image_width, image_height
    )

    cropped_rgb = np.array(pil_image)[y : y + height, x : x + width]
    cropped_face = Image.fromarray(cropped_rgb)

    return {
        "face_found": True,
        "bbox": {"x": x, "y": y, "width": width, "height": height},
        "cropped_face": cropped_face,
        "original_size": {"width": image_width, "height": image_height},
    }


def draw_bbox_on_image(pil_image: Image.Image, bbox: dict) -> Image.Image:
    """Draw a green bounding box on a copy of the image."""
    bgr, _ = _pil_to_bgr_gray(pil_image)
    annotated = bgr.copy()
    x, y, width, height = bbox["x"], bbox["y"], bbox["width"], bbox["height"]
    cv2.rectangle(annotated, (x, y), (x + width, y + height), (0, 255, 0), 2)
    rgb = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)
