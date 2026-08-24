from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import predict

app = FastAPI(title="ASD Emotion Recognition API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router)


@app.get("/")
def health_check():
    return {"status": "ok"}
