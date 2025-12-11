import os
import shutil
import subprocess
from datetime import datetime
from typing import List, Tuple

from fastapi import UploadFile, HTTPException


def ensure_ffmpeg_available() -> None:
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
    except Exception:
        raise HTTPException(status_code=500, detail="FFmpeg is not available on the server PATH")


def save_video_to_dated_folder(file: UploadFile) -> Tuple[str, str]:
    now = datetime.now()
    base_dir = os.path.join("storage", now.strftime("%Y"), now.strftime("%m"), now.strftime("%d"))
    original_dir = os.path.join(base_dir, "original")
    os.makedirs(original_dir, exist_ok=True)

    safe_name = file.filename or f"upload_{now.strftime('%H%M%S')}.mp4"
    dest_path = os.path.join(original_dir, safe_name)

    # If exists, add timestamp suffix
    if os.path.exists(dest_path):
        name, ext = os.path.splitext(safe_name)
        dest_path = os.path.join(original_dir, f"{name}_{now.strftime('%H%M%S')}{ext}")

    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return dest_path, base_dir


def trim_clips(source_path: str, clips: List[Tuple[float, float]], base_dir: str) -> List[str]:
    ensure_ffmpeg_available()
    clips_dir = os.path.join(base_dir, "clips")
    os.makedirs(clips_dir, exist_ok=True)

    created: List[str] = []
    src_name = os.path.splitext(os.path.basename(source_path))[0]
    for idx, (start_s, end_s) in enumerate(clips):
        if start_s < 0 or end_s <= start_s:
            raise HTTPException(status_code=400, detail=f"Invalid clip times at index {idx}")
        out_name = f"{src_name}_trim_{start_s:.2f}-{end_s:.2f}_{idx+1}.mp4"
        out_path = os.path.join(clips_dir, out_name)

        # Try fast stream copy when possible
        copy_cmd = [
            "ffmpeg", "-ss", str(start_s), "-to", str(end_s), "-i", source_path,
            "-c", "copy", "-movflags", "+faststart", "-avoid_negative_ts", "1", "-y", out_path
        ]
        result = subprocess.run(copy_cmd, capture_output=True, text=True)
        need_fallback = (
            result.returncode != 0 or (not os.path.exists(out_path)) or (os.path.exists(out_path) and os.path.getsize(out_path) == 0)
        )
        if need_fallback:
            # Remove bad artifact if any and re-encode with explicit duration
            try:
                if os.path.exists(out_path):
                    os.remove(out_path)
            except Exception:
                pass
            cmd = [
                "ffmpeg", "-ss", str(start_s), "-i", source_path, "-t", str(max(end_s - start_s, 0.01)),
                "-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac", "-movflags", "+faststart", "-y", out_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0 or (not os.path.exists(out_path)) or os.path.getsize(out_path) == 0:
                raise HTTPException(status_code=500, detail=f"FFmpeg failed for clip {idx+1}: {result.stderr[:200]}")
        created.append(out_path)
    return created


