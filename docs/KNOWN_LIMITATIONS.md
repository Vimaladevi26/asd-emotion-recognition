# Known Limitations

This document records honest, tested limits of the current emotion recognition pipeline. These are expected for a FER2013 transfer-learning baseline — not signs of a broken implementation.

## Manual real-world test (Phase 2)

We tested `POST /predict` on **8 real face photos** covering all seven emotion categories.

| Result | Count |
|--------|-------|
| Correct top-1 prediction | **5 / 8 (62.5%)** |
| Incorrect prediction | 2 / 8 |
| No face detected | 1 / 8 |

This is **consistent with the model’s reported 55.8% accuracy on the FER2013 test set** — real-world photos performed similarly, not dramatically worse.

### Observed confusions

| Test case | Predicted | Likely cause |
|-----------|-----------|--------------|
| Sad expression | Angry | Sad / angry / neutral often look similar at low resolution; visible in `docs/confusion_matrix.png` |
| Angry expression | Neutral | Same cluster — subtle brow/mouth cues collapse to 224×224 grayscale |
| Open-mouth “surprised” photo | Happy | Wide open mouth overlaps with “happy” in FER2013; a common class-pair confusion |

These match **known FER2013 confusion patterns**, not random pipeline failures.

### Face not detected

| Test case | Result | Cause |
|-----------|--------|-------|
| `test_sad1.jpg` (side angle, low light) | `face_found: false` | **Haar cascade limitation** — struggles with profile views and poor lighting. This is a detection issue, not model accuracy. |

**Future improvement:** Consider **MTCNN** (mentioned in the project roadmap) for more robust face detection if profile/low-light cases matter for your use case.

---

## Model accuracy caveat

- **Reported test accuracy:** 55.8% on FER2013 (below the roadmap goal of ≥65%, but usable as a portfolio baseline).
- **Real-world photos** may score similarly or slightly higher/lower depending on lighting, camera angle, resolution, and crop quality.
- The pipeline was verified against Colab training settings (224×224 input, ImageFolder alphabetical labels, matching preprocessing).

---

## Why these numbers are not alarming

FER2013 is a **genuinely hard dataset**:

- Images are small (48×48 in the original dataset; we use 224×224 crops at inference).
- Labels are noisy — **human annotators only agree ~65–70% of the time** on the same faces.
- Many emotion pairs (sad/angry/neutral, surprise/happy) are visually ambiguous even for people.

So **~55–62% accuracy is in line with what this dataset supports**, especially for a lightweight MobileNetV2 fine-tune. The goal of Phase 2 is a working end-to-end demo, not clinical-grade recognition.

---

## What works well

- Correct preprocessing and label order (verified against Colab training code).
- Face crop + predict pipeline runs without crashes.
- Clear frontal, reasonably lit faces tend to get sensible predictions (e.g. happy faces often score >90% happy after bug fixes).

---

## Related artifacts

- `docs/confusion_matrix.png` — per-class error patterns from training evaluation
- `backend/tests/` — pytest guards for label order, input size, and response shape
