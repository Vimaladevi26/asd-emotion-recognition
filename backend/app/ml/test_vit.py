"""CLI smoke test for ViT emotion inference."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run ViT (trpakov/vit-face-expression) inference on an image."
    )
    parser.add_argument("image_path", help="Path to a face crop or test image")
    args = parser.parse_args()

    image_path = Path(args.image_path)
    if not image_path.is_file():
        print(f"Error: image not found: {image_path}", file=sys.stderr)
        return 1

    from app.ml.vit_model import predict_emotion_vit

    result = predict_emotion_vit(Image.open(image_path))
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
