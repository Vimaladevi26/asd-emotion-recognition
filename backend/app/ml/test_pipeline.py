"""CLI to test the raw-image emotion prediction pipeline."""

from __future__ import annotations

import argparse
import json
import sys


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run face detection + emotion prediction on a raw image."
    )
    parser.add_argument("image_path", help="Path to a test image")
    args = parser.parse_args()

    from app.ml.pipeline import predict_emotion_from_raw_image

    result = predict_emotion_from_raw_image(args.image_path)
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
