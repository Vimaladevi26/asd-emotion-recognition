"""CLI smoke test for FER model inference."""

from __future__ import annotations

import argparse
import json
import sys


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run FER emotion inference on a single image."
    )
    parser.add_argument("image_path", help="Path to an image file")
    args = parser.parse_args()

    from app.ml.model import predict_emotion

    result = predict_emotion(args.image_path)
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
