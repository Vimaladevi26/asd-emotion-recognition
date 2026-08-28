# Quiz reference images

## Source

**Custom flashcard artwork** — cropped PNGs from the project author's own hand-made children's emotion flashcard set. Original work; no external assets or licensing concerns.

## Files (6 emotions)

| App emotion | File | Flashcard source |
|-------------|------|------------------|
| angry | `angry.png` | Angry flashcard |
| fear | `fear.png` | **Scared** flashcard |
| happy | `happy.png` | Happy flashcard |
| neutral | `neutral.png` | **Bored** flashcard |
| sad | `sad.png` | Sad flashcard |
| surprise | `surprise.png` | Surprise flashcard |

## Disgust — intentionally omitted (v1)

The source flashcard set does not include a **disgust** card. Quiz mode v1 covers **6 of 7** model emotions. This gap is documented in `docs/KNOWN_LIMITATIONS.md`.

Omitting disgust for v1 is acceptable: many professional children's emotion materials also skip disgust (harder to depict clearly for young learners). A disgust reference image can be added when a suitable flashcard is created.

## Format

- PNG, cropped from flashcard scans
- Served from `/quiz/` (e.g. `/quiz/happy.png`)

## Previous approaches (replaced)

1. FER2013 JPEGs — grainy, inconsistent.
2. Hand-coded SVGs — angry/sad too similar in early drafts.
3. OpenMoji — emoji-style, poor generalization for ASD use.
4. Flaticon search — no single consistent child flashcard pack found.

## Usage

Load paths from `manifest.json` in the quiz UI, e.g. `/quiz/happy.png`.
