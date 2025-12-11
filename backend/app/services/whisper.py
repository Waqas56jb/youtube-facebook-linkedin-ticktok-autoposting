from typing import Optional
from fastapi import HTTPException
import os

try:
    from faster_whisper import WhisperModel
except Exception:
    WhisperModel = None  # type: ignore

from backend.app.config import settings


_whisper_model: Optional[WhisperModel] = None


def get_whisper_model() -> WhisperModel:
    global _whisper_model
    if WhisperModel is None:
        raise HTTPException(status_code=500, detail="faster-whisper is not installed on the server")
    if _whisper_model is None:
        # Auto-optimize defaults for speed if not explicitly set
        device = settings.whisper_device or "auto"
        compute_type = settings.whisper_compute_type or "auto"
        # Prefer GPU when available
        if device == "auto":
            # ctranslate2 uses "cuda" for NVIDIA GPUs
            device = "cuda" if os.environ.get("CUDA_VISIBLE_DEVICES", "") != "" else "cpu"
        # Use int8 quantization on CPU for speed; float16 on GPU
        if compute_type == "auto":
            compute_type = "float16" if device == "cuda" else "int8"
        extra: dict = {}
        # Allow threading tuning for CPU
        if settings.whisper_cpu_threads and settings.whisper_cpu_threads > 0:
            extra["cpu_threads"] = settings.whisper_cpu_threads
        _whisper_model = WhisperModel(
            settings.whisper_model,
            device=device,
            compute_type=compute_type,
            **extra,
        )
    return _whisper_model


