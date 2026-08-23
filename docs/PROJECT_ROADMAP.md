# Personalized Emotion Recognition and Progress-Tracking System for Autism Therapy

**Author:** Vimala Devi C, M.Tech Data Science, SRM Institute of Science and Technology
**SDG Alignment:** SDG 3 (Good Health and Well-Being), SDG 4 (Quality Education — secondary)
**Base Paper:** Ying et al., "An Augmentative System with Facial and Emotion Recognition for Improving Social Skills of Children with Autism Spectrum Disorders," IEEE, 2020.

---

## 1. Software Requirements Specification (SRS)

### 1.1 Purpose
A web application that helps children with ASD practice recognizing facial emotions through
real-time detection, adapts practice difficulty to each child's weak spots, explains its own
predictions (via Grad-CAM), and tracks progress over weeks/months for therapists and parents.

### 1.2 Scope
In scope: web app, single-child-per-login practice sessions, real-time webcam-based emotion
detection, 6-7 basic emotion classes (happy, sad, angry, surprise, fear, disgust, neutral),
personalization engine, explainability overlay, longitudinal dashboard.

Out of scope (v1): multi-child clinic management, native mobile app, video-based (temporal)
emotion recognition, voice/speech emotion analysis.

### 1.3 Functional Requirements
| ID | Requirement |
|----|-------------|
| FR1 | System shall capture live webcam video and detect a face in each frame |
| FR2 | System shall classify the detected face into one of 7 emotion categories with a confidence score |
| FR3 | System shall present a practice exercise (e.g., "show me happy") and evaluate the child's response |
| FR4 | System shall track per-emotion accuracy per child across sessions |
| FR5 | System shall adaptively select which emotions to practice next based on weak-spot history |
| FR6 | System shall generate a Grad-CAM heatmap overlay showing which facial regions drove each prediction |
| FR7 | System shall store every session's results (timestamp, emotion, prediction, confidence, correctness) |
| FR8 | System shall render a dashboard with weekly/monthly accuracy trends per emotion, per child |
| FR9 | System shall support therapist/parent login separate from a session-only child view |

### 1.4 Non-Functional Requirements
| ID | Requirement |
|----|-------------|
| NFR1 | Real-time inference latency under 500ms per frame on a standard laptop webcam |
| NFR2 | Model accuracy ≥ 65% on FER2013 test set (transfer-learning baseline) |
| NFR3 | UI must be simple, low-clutter, high-contrast — appropriate for children with ASD (avoid sensory overload) |
| NFR4 | All child session data stored securely; no data leaves the local/deployed database |
| NFR5 | System deployable as a public demo (Render/Vercel/HF Spaces) for portfolio purposes |

### 1.5 Users
- **Child** — uses the practice/camera screen only, minimal UI, large buttons, positive reinforcement.
- **Therapist/Parent** — uses the dashboard, sees explainability outputs, manages child profiles.

---

## 2. System Architecture (see diagram in chat)

```
React frontend  →  FastAPI backend  →  FER model (MobileNetV2, fine-tuned on FER2013)
                                     →  Grad-CAM explainability layer
                                     →  Personalization engine (rule-based, then adaptive)
                                     →  PostgreSQL / SQLite database (sessions, predictions)
                                     ←  Dashboard reads aggregated data back
```

### 2.1 Recommended Tech Stack
- **Frontend:** React + Vite, TailwindCSS, `react-webcam` for camera access, Recharts for the dashboard
- **Backend:** Python, FastAPI, Uvicorn
- **ML:** PyTorch (or TensorFlow/Keras — PyTorch recommended, more common in current job postings), OpenCV (face detection via `mtcnn` or `haarcascade`), `pytorch-grad-cam` library for explainability
- **Database:** SQLite for local dev → PostgreSQL for deployment (via SQLAlchemy ORM, so switching is a one-line config change)
- **Deployment:** Backend on Render/Railway, Frontend on Vercel, Model checkpoint on Hugging Face Hub or GitHub Releases (models are too big for a normal git commit)
- **Dataset:** FER2013 (Kaggle) — 35,887 grayscale 48x48 images, 7 emotion classes

### 2.2 Repository Structure
```
asd-emotion-recognition/
├── README.md                  ← the single most important file for your resume link
├── backend/
│   ├── app/
│   │   ├── main.py             (FastAPI entrypoint)
│   │   ├── models/             (SQLAlchemy DB models)
│   │   ├── routers/            (API endpoints: /predict, /sessions, /dashboard)
│   │   ├── ml/
│   │   │   ├── model.py        (load FER model, run inference)
│   │   │   ├── gradcam.py      (explainability layer)
│   │   │   └── personalization.py
│   │   └── schemas.py          (Pydantic request/response models)
│   ├── requirements.txt
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/ (PracticeSession.jsx, Dashboard.jsx, Login.jsx)
│   │   └── api/ (axios calls to backend)
│   └── package.json
├── ml-training/
│   ├── train_fer_model.ipynb   (Colab notebook — training happens here, not on your laptop)
│   ├── data_prep.py
│   └── evaluate.py
└── docs/
    ├── PROJECT_ROADMAP.md      (this file)
    └── screenshots/
```

---

## 3. Phase-by-Phase Build Plan

### Phase 0 — Project Setup (Aug 23–25)
- [ ] Create GitHub repo `asd-emotion-recognition`, add `.gitignore` (Python + Node), MIT license
- [ ] Set up folder structure above
- [ ] Initialize backend: `python -m venv venv`, install FastAPI, confirm `uvicorn main:app --reload` runs
- [ ] Initialize frontend: `npm create vite@latest frontend -- --template react`, confirm it runs
- [ ] First commit: "Initial project scaffold"
- **Deliverable:** empty-but-running frontend + backend, pushed to GitHub

### Phase 1 — FER Model (Aug 26 – Sep 3)
- [ ] Download FER2013 from Kaggle
- [ ] In a Colab notebook: load data, build a MobileNetV2-based transfer learning model (freeze base layers, replace classifier head with 7-class output), fine-tune
- [ ] Evaluate: accuracy, confusion matrix, per-class precision/recall (this confusion matrix becomes a great README image)
- [ ] Export the trained model (`.pth` or `.h5`)
- [ ] Write `backend/app/ml/model.py` to load the model and run inference on a single image
- **Deliverable:** trained model file + a script that takes an image path and prints the predicted emotion + confidence

### Phase 2 — Real-Time Detection Pipeline (Sep 4–8)
- [ ] Add face detection (OpenCV Haar cascade or MTCNN) before classification — crop the face first
- [ ] Build `/predict` FastAPI endpoint: accepts an image (webcam frame), returns emotion + confidence
- [ ] Connect React `react-webcam` component to call `/predict` every N frames
- **Deliverable:** working webcam → live emotion label displayed in browser

### Phase 3 — Explainability Layer (Sep 9–12)
- [ ] Integrate `pytorch-grad-cam` to generate a heatmap for each prediction
- [ ] Overlay heatmap on the face image, return as base64 in the API response
- [ ] Display overlay in frontend next to the prediction
- **Deliverable:** every prediction shows *why* — a heatmap on eyes/mouth/brows

### Phase 4 — Database & Session Tracking (Sep 13–16)
- [ ] Design schema: `Child`, `Session`, `Prediction` tables (SQLAlchemy models)
- [ ] `/sessions` endpoints: create session, log each prediction with correctness
- [ ] Simple child login (even just a name/ID, no real auth needed for v1)
- **Deliverable:** every practice attempt is persisted to the database

### Phase 5 — Personalization Engine (Sep 17–20)
- [ ] Compute per-emotion accuracy per child from stored predictions
- [ ] Rule-based adaptive logic: next exercise weighted toward the child's lowest-accuracy emotions
- [ ] Expose via `/next-exercise` endpoint
- **Deliverable:** practice sessions visibly adapt — a child who struggles with "fear" gets more fear exercises

### Phase 6 — Progress Dashboard (Sep 21–25)
- [ ] `/dashboard/{child_id}` endpoint: aggregate weekly/monthly accuracy trends
- [ ] React dashboard page using Recharts: line chart per emotion over time, overall accuracy trend
- **Deliverable:** the differentiating feature from your PPT — a visual "improvement journey"

### Phase 7 — Polish, Testing, Report (Sep 26 – Oct 5)
- [ ] Basic UI polish (Tailwind, child-friendly design, positive reinforcement animations)
- [ ] Write a few backend tests (pytest) for the API endpoints
- [ ] Write the project report / paper sections using your PPT content as the base
- **Deliverable:** demo-ready app + report draft

### Phase 8 — Deployment & GitHub Polish (Oct 6–15)
- [ ] Deploy backend (Render/Railway) + frontend (Vercel)
- [ ] Write a strong README: problem statement, architecture diagram, screenshots/GIF, tech stack badges, live demo link, "how to run locally"
- [ ] Add a short demo video/GIF (this matters a lot for resume reviewers who won't clone your repo)
- **Deliverable:** public GitHub repo + live demo link, ready to put on your resume

---

## 4. What Makes This Resume-Strong
- Real trained model with reported metrics (not just "used a pretrained API")
- Full-stack: React + FastAPI + PostgreSQL — shows you can ship, not just notebook-experiment
- Explainable AI (Grad-CAM) — a genuinely in-demand skill area
- A novel contribution beyond the base paper (personalization + longitudinal tracking) — good talking point in interviews
- Clean README + live demo — most reviewers judge a repo in under 60 seconds

## 5. Immediate Next Step
Start Phase 0 right now in Cursor: create the repo, scaffold both folders, get "Hello World" running
on both frontend and backend, and make your first commit. Everything else builds on top of that.
