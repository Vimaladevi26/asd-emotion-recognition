"""Tests for ViT Grad-CAM reshape helpers."""

import torch

from app.ml.gradcam import reshape_transform


def test_reshape_transform_returns_b_c_14_14():
    dummy = torch.randn(2, 197, 768)
    result = reshape_transform(dummy)
    assert result.shape == (2, 768, 14, 14)
