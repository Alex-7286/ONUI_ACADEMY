from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, exams, lectures, speech, videos
from app.core.config import get_allowed_origin_regex, get_allowed_origins
from app.core.database import init_db

app = FastAPI(title="ONUI Academy API", version="0.1.0")


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    lectures.warm_lecture_cache()


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_origin_regex=get_allowed_origin_regex(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(videos.router)
app.include_router(auth.router)
app.include_router(lectures.router)
app.include_router(exams.router)
app.include_router(speech.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
