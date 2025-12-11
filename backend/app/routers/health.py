from fastapi import APIRouter
from backend.app.config import settings


router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {
        "status": "ok",
        "version": settings.api_version,
        "whisper_model": settings.whisper_model,
        "device": settings.whisper_device,
    }


