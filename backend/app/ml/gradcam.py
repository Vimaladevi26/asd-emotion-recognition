"""ViT-adapted Grad-CAM overlay for the live Hugging Face emotion model."""

from __future__ import annotations

import base64
import io
import logging

import numpy as np
import torch
from PIL import Image
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget

from app.ml.vit_model import _load_vit_model, _normalize_label

logger = logging.getLogger(__name__)

EXPECTED_IMAGE_SIZE = 224
EXPECTED_PATCH_SIZE = 16
EXPECTED_GRID = EXPECTED_IMAGE_SIZE // EXPECTED_PATCH_SIZE  # 14


class _ViTLogitsWrapper(torch.nn.Module):
    """Expose raw logits so pytorch-grad-cam does not receive an HF output object."""

    def __init__(self, hf_model: torch.nn.Module) -> None:
        super().__init__()
        self.hf_model = hf_model

    def forward(self, pixel_values: torch.Tensor) -> torch.Tensor:
        return self.hf_model(pixel_values=pixel_values).logits


def reshape_transform(tensor: torch.Tensor) -> torch.Tensor:
    """Drop the CLS token and reshape 196 patch tokens into a (B, C, 14, 14) map."""
    if isinstance(tensor, (tuple, list)):
        tensor = tensor[0]

    patch_tokens = tensor[:, 1:, :]
    batch, num_patches, channels = patch_tokens.shape
    grid = int(num_patches**0.5)
    if grid * grid != num_patches:
        raise ValueError(
            f"Patch tokens do not form a square grid (got {num_patches} tokens)."
        )
    if grid != EXPECTED_GRID:
        raise ValueError(
            f"Expected {EXPECTED_GRID}x{EXPECTED_GRID} grid from ViT "
            f"{EXPECTED_IMAGE_SIZE}/{EXPECTED_PATCH_SIZE}, got {grid}x{grid}."
        )

    spatial = patch_tokens.reshape(batch, grid, grid, channels)
    return spatial.permute(0, 3, 1, 2).contiguous()


def _assert_224_16_patch_grid(model: torch.nn.Module) -> None:
    image_size = model.config.image_size
    patch_size = model.config.patch_size
    if isinstance(image_size, (tuple, list)):
        image_size = image_size[0]
    if isinstance(patch_size, (tuple, list)):
        patch_size = patch_size[0]
    if image_size != EXPECTED_IMAGE_SIZE or patch_size != EXPECTED_PATCH_SIZE:
        raise ValueError(
            f"Expected ViT image_size={EXPECTED_IMAGE_SIZE} patch_size={EXPECTED_PATCH_SIZE}, "
            f"got image_size={image_size} patch_size={patch_size}."
        )


def _hf_class_index(model: torch.nn.Module, canonical_emotion: str) -> int:
    """Map a canonical app label (e.g. 'angry') to the model's id2label index."""
    for raw_idx, raw_label in model.config.id2label.items():
        if _normalize_label(str(raw_label)) == canonical_emotion:
            return int(raw_idx)
    raise ValueError(f"No Hugging Face class index for emotion {canonical_emotion!r}.")


def _overlay_png_base64(cropped_face: Image.Image, grayscale_cam: np.ndarray) -> str:
    rgb = np.asarray(cropped_face.convert("RGB"), dtype=np.float32) / 255.0
    cam = grayscale_cam.astype(np.float32)
    if cam.shape != rgb.shape[:2]:
        cam_image = Image.fromarray(np.uint8(np.clip(cam, 0, 1) * 255), mode="L")
        cam_image = cam_image.resize((rgb.shape[1], rgb.shape[0]), Image.BILINEAR)
        cam = np.asarray(cam_image, dtype=np.float32) / 255.0

    overlay = show_cam_on_image(rgb, cam, use_rgb=True)
    buffer = io.BytesIO()
    Image.fromarray(overlay).save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def compute_gradcam_overlay(cropped_face: Image.Image, predicted_emotion: str) -> str | None:
    """
    Grad-CAM heatmap over the cropped face for the predicted emotion.

    Reuses the live ViT via ``_load_vit_model`` (lru_cache). Never wraps the
    CAM backward pass in ``torch.no_grad``. Returns raw PNG base64, or None
    if explainability fails — callers must still return the prediction.
    """
    try:
        processor, model = _load_vit_model()
        _assert_224_16_patch_grid(model)

        rgb_image = cropped_face.convert("RGB")
        pixel_values = processor(images=rgb_image, return_tensors="pt")["pixel_values"]
        class_idx = _hf_class_index(model, predicted_emotion)

        wrapper = _ViTLogitsWrapper(model)
        # transformers 5 ViT: blocks live on vit.layers (no vit.encoder).
        # Last-but-one block — last-block patch grads can be ~0 (CLS carries the class).
        target_layers = [wrapper.hf_model.vit.layers[-2]]

        # Gradients required: do not use torch.no_grad() around this block.
        with GradCAM(
            model=wrapper,
            target_layers=target_layers,
            reshape_transform=reshape_transform,
        ) as cam:
            grayscale_cam = cam(
                input_tensor=pixel_values,
                targets=[ClassifierOutputTarget(class_idx)],
            )[0]

        return _overlay_png_base64(rgb_image, grayscale_cam)
    except Exception:
        logger.exception("Grad-CAM overlay failed; returning no heatmap.")
        return None
