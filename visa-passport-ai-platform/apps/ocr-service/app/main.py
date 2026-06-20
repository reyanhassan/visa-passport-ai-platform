from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes import health, passport

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
    description="Provider-neutral passport OCR and MRZ parsing service.",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Internal-API-Key"],
)

app.include_router(health.router)
app.include_router(passport.router)
