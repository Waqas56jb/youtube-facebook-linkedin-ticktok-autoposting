from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Dict

from backend.app.services.video_trim import save_video_to_dated_folder, trim_clips
from backend.app.services.llm import generate_caption_and_title
from backend.app.services.transcription import transcribe_media
import os
import shutil


router = APIRouter(tags=["video"]) 


class ClipSpec(BaseModel):
    start: float
    end: float


class TrimRequest(BaseModel):
    source_path: str
    clips: List[ClipSpec]


@router.post("/video/upload")
async def upload_video(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename required")
    dest_path, base_dir = save_video_to_dated_folder(file)
    return {"ok": True, "source_path": dest_path, "base_dir": base_dir}


@router.post("/video/trim")
async def video_trim(req: TrimRequest):
    created = trim_clips(req.source_path, [(c.start, c.end) for c in req.clips], base_dir=req.source_path.rsplit("original", 1)[0].rstrip("/\\"))
    return {"ok": True, "clips": created}


@router.get("/video/clips-by-date")
async def clips_by_date() -> Dict[str, List[str]]:
    base_storage = os.path.join("storage")
    grouped: Dict[str, List[str]] = {}
    if not os.path.isdir(base_storage):
        return grouped
    for year in sorted(os.listdir(base_storage)):
        year_path = os.path.join(base_storage, year)
        if not os.path.isdir(year_path):
            continue
        for month in sorted(os.listdir(year_path)):
            month_path = os.path.join(year_path, month)
            if not os.path.isdir(month_path):
                continue
            for day in sorted(os.listdir(month_path)):
                day_path = os.path.join(month_path, day, "clips")
                key = f"{year}-{month}-{day}"
                if os.path.isdir(day_path):
                    files = [os.path.join(day_path, f) for f in os.listdir(day_path) if f.lower().endswith((".mp4", ".mov", ".mkv", ".webm", ".avi"))]
                    if files:
                        grouped[key] = sorted(files)
    return grouped


class DeleteRequest(BaseModel):
    path: str


@router.post("/video/delete")
async def delete_clip(req: DeleteRequest):
    # Only allow deletions under storage directory
    storage_root = os.path.abspath("storage")
    raw_path = req.path.replace("\\", "/")
    # Accept media URLs or absolute URLs as well
    if raw_path.startswith("/media/"):
        raw_path = raw_path[len("/media/"):]
    if raw_path.startswith("http://") or raw_path.startswith("https://"):
        # Extract path part and convert /media/... to storage-relative
        try:
            from urllib.parse import urlparse
            p = urlparse(raw_path).path
            if p.startswith("/media/"):
                raw_path = p[len("/media/"):]
            elif p.startswith("/storage/"):
                raw_path = p[len("/storage/"):]
            else:
                # fallback to last path segments after 'storage/' if present
                idx = p.find("/storage/")
                if idx != -1:
                    raw_path = p[idx + len("/storage/"):]
                else:
                    raw_path = p.lstrip("/")
        except Exception:
            raw_path = raw_path
    if raw_path.startswith("storage/"):
        raw_path = raw_path[len("storage/"):]
    abs_path = os.path.abspath(os.path.join(storage_root, raw_path))
    if not abs_path.startswith(storage_root):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not os.path.exists(abs_path):
        return {"ok": True, "deleted": req.path, "note": "already missing"}
    try:
        os.remove(abs_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {e}")
    return {"ok": True, "deleted": req.path}


class CaptionRequest(BaseModel):
    path: str
    seed: int | None = None


@router.post("/video/caption")
async def video_caption(req: CaptionRequest):
    # Normalize path: accept absolute URLs or /media/... and map to storage file path
    raw_path = req.path.replace("\\", "/")
    storage_root = os.path.abspath("storage")
    def _normalize_to_storage(p: str) -> str:
        if p.startswith("http://") or p.startswith("https://"):
            try:
                from urllib.parse import urlparse
                parsed = urlparse(p).path
                p = parsed
            except Exception:
                pass
        if p.startswith("/media/"):
            p = p[len("/media/"):]
        if p.startswith("/storage/"):
            p = p[len("/storage/"):]
        if p.startswith("storage/"):
            p = p[len("storage/"):]
        abs_p = os.path.abspath(os.path.join(storage_root, p.lstrip("/")))
        return abs_p

    abs_path = _normalize_to_storage(raw_path)
    if not abs_path.startswith(storage_root):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="Video not found")

    name = os.path.basename(abs_path)
    # Always transcribe the video first using Whisper, then generate based on transcript only
    try:
        transcript_text, _segments, _lang, _duration = transcribe_media(abs_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

    # If transcript is empty, still attempt LLM; otherwise create deterministic fallback
    try:
        data = generate_caption_and_title(filename=name, transcript=transcript_text, seed=req.seed)
        return {"ok": True, "transcript": transcript_text, **data}
    except Exception:
        # Build deterministic fallback grounded in transcript
        text = (transcript_text or "").strip()
        def _simple_terms(t: str, limit: int = 20) -> list[str]:
            import re
            toks = re.findall(r"[A-Za-z][A-Za-z\-']+", t.lower())
            stop = set(['the','a','an','and','or','but','so','to','of','in','on','for','with','as','at','by','from','is','are','was','were','be','been','being','it','its','that','this','these','those','i','you','he','she','we','they','them','me','my','our','your','his','her','their','not','no','do','did','does','doing','have','has','had','having','about','into','over','after','before','between','up','down','out','again','further','then','once','here','there','when','where','why','how','all','any','both','each','few','more','most','other','some','such','only','own','same','than','too','very','can','will','just','now'])
            freq: dict[str,int] = {}
            for t in toks:
                if t in stop or len(t) <= 2:
                    continue
                freq[t] = freq.get(t, 0) + 1
            return [k for k,_ in sorted(freq.items(), key=lambda kv: (-kv[1], kv[0]))[:limit]]
        terms = _simple_terms(text, 12)
        title = (" ".join([w.capitalize() for w in terms[:6]]) or (name.rsplit('.',1)[0]))[:60]
        if not title:
            title = "Daily Routine Overview"
        caption = text[:1400] if text else ""
        if len(caption) < 300:
            caption = (caption + ("\n\n" + text))[:1200]
        if not caption:
            caption = "This clip summarizes the content of the video in plain language based on the available transcript."
        tags = " ".join(["#" + w.replace(" ", "") for w in terms]) or "#video #transcript"
        return {"ok": True, "transcript": text, "title": title, "caption": caption.strip(), "hashtags": tags}


