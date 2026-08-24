"""Shared paths and pytest configuration for backend tests."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent
FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

sys.path.insert(0, str(BACKEND_ROOT))

CONFUSION_MATRIX = PROJECT_ROOT / "docs" / "confusion_matrix.png"
HAPPY_FACE_CROP = FIXTURES_DIR / "happy_face_crop.jpg"
