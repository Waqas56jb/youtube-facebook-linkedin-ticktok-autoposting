from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from backend.app.models import TranscriptResponse, TranscriptSegment
from backend.app.services.transcription import (
    save_upload_to_temp,
    detect_mime_type,
    is_document_file,
    extract_document_text,
    transcribe_media,
)
from backend.app.services.whisper import get_whisper_model

import os


router = APIRouter(tags=["transcript"])
@router.get("/health")
async def transcript_health():
    """Verify Whisper is available and can be initialized."""
    try:
        _ = get_whisper_model()
        return {"ok": True, "message": "Whisper model initialized"}
    except HTTPException as e:
        return {"ok": False, "message": e.detail}
    except Exception as e:
        return {"ok": False, "message": str(e)}



@router.post("/upload", response_model=TranscriptResponse)
async def transcript_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    temp_path = save_upload_to_temp(file)
    try:
        mime = file.content_type or detect_mime_type(temp_path, file.filename)
        name_lower = (file.filename or "").lower()

        if is_document_file(name_lower, mime):
            text = extract_document_text(temp_path, name_lower, mime)
            if not text.strip():
                raise HTTPException(status_code=422, detail="No extractable text found in the document")
            paragraphs = [p.strip() for p in text.splitlines() if p.strip()]
            segments = [TranscriptSegment(text=p) for p in paragraphs]
            return TranscriptResponse(kind="document", transcript=text.strip(), segments=segments)

        try:
            transcript_text, segments, language, duration = transcribe_media(temp_path)
        except HTTPException as e:
            # Provide actionable guidance for common setup issues
            hint = (
                "Ensure faster-whisper is installed and ffmpeg is available on PATH. "
                "On Windows, install ffmpeg and restart the server."
            )
            raise HTTPException(status_code=e.status_code, detail=f"{e.detail}. {hint}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}. Ensure ffmpeg is installed and restart the server.")
        if not transcript_text:
            raise HTTPException(status_code=422, detail="Transcription produced no text")
        return TranscriptResponse(
            kind="media",
            transcript=transcript_text,
            segments=segments,
            language=language,
            duration=duration,
        )
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass


@router.post("/manual", response_model=TranscriptResponse)
async def transcript_manual(text: str = Form(...)):
    paragraphs = [p.strip() for p in text.splitlines() if p.strip()]
    segments = [TranscriptSegment(text=p) for p in paragraphs] or [TranscriptSegment(text=text.strip())]
    return TranscriptResponse(kind="document", transcript=text.strip(), segments=segments)
