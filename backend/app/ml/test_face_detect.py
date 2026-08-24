"""CLI to test face detection and save visual debug outputs."""

from __future__ import annotations

import argparse
import sys
from datetime import datetime
from pathlib import Path

from PIL import Image

from app.ml.face_detect import detect_and_crop_face, draw_bbox_on_image

SCREENSHOTS_DIR = Path(__file__).resolve().parents[3] / "docs" / "screenshots"


def _stem_from_path(image_path: Path) -> str:
    return image_path.stem


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Detect a face, save annotated and cropped debug images."
    )
    parser.add_argument("image_path", help="Path to a test image")
    args = parser.parse_args()

    image_path = Path(args.image_path)
    if not image_path.is_file():
        print(f"Error: image not found: {image_path}", file=sys.stderr)
        return 1

    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    stem = _stem_from_path(image_path)
    prefix = f"{stem}_{timestamp}"

    result = detect_and_crop_face(image_path)

    if not result["face_found"]:
        print(f"No face detected in {image_path}")
        print(f"Original size: {result['original_size']}")
        return 0

    original = Image.open(image_path).convert("RGB")
    annotated = draw_bbox_on_image(original, result["bbox"])

    annotated_path = SCREENSHOTS_DIR / f"{prefix}_annotated.jpg"
    crop_path = SCREENSHOTS_DIR / f"{prefix}_crop.jpg"

    annotated.save(annotated_path, format="JPEG", quality=95)
    result["cropped_face"].save(crop_path, format="JPEG", quality=95)

    print(f"Face detected: {result['bbox']}")
    print(f"Saved annotated image: {annotated_path}")
    print(f"Saved cropped face:    {crop_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
