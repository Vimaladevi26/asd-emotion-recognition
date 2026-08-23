from fastapi import FastAPI

app = FastAPI(title="ASD Emotion Recognition API")


@app.get("/")
def health_check():
    return {"status": "ok"}
