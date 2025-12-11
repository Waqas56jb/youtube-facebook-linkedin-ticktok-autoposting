"""
Video management router for frontend integration
"""
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import Dict, List, Any
import os
from pathlib import Path
from datetime import datetime
import json
import shutil
import urllib.request
import urllib.error
import urllib.parse

# Gemini caption/title generation
from backend.app.services.llm import generate_caption_and_title

# YouTube upload service
from backend.services.youtube_service import YouTubeService
from backend.models.database import Database

router = APIRouter(prefix="/video", tags=["video-management"])

# Storage directory for clips
STORAGE_DIR = Path("storage")

# YouTube service singleton-ish
_yt_service = YouTubeService(Database())

@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload a video file"""
    try:
        # Create today's directory
        today = datetime.now().strftime("%Y/%m/%d")
        upload_dir = STORAGE_DIR / today / "original"
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%H%M%S")
        filename = f"{file.filename.split('.')[0]}_{timestamp}.{file.filename.split('.')[-1]}"
        file_path = upload_dir / filename
        
        # Save the file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        rel = str(file_path.relative_to(STORAGE_DIR)).replace('\\', '/')
        return {
            "success": True,
            "path": rel,
            "source_path": rel,  # frontend expects source_path
            "message": "Video uploaded successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

@router.post("/trim")
async def trim_video(request: Request):
    """Trim a video file. Supports batch clips from frontend."""
    try:
        body = await request.json()
        # Frontend batch format
        source_path = body.get("source_path") or body.get("inputPath")
        clips = body.get("clips")
        if not source_path:
            raise HTTPException(status_code=400, detail="source_path is required")
        input_full_path = STORAGE_DIR / source_path
        if not input_full_path.exists():
            raise HTTPException(status_code=404, detail="Input file not found")

        # Verify ffmpeg is available
        try:
            import subprocess
            _check = subprocess.run(["ffmpeg", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if _check.returncode != 0:
                raise RuntimeError("ffmpeg returned non-zero exit code")
        except FileNotFoundError:
            raise HTTPException(status_code=503, detail="ffmpeg is not installed or not on PATH. Please install ffmpeg and restart the backend.")
        except Exception:
            # Continue; actual trim will still try and report per-clip failures
            pass

        # Extract date from source path or use today's date
        # Source path format: storage/YYYY/MM/DD/original/filename.mp4
        path_parts = source_path.split('/')
        if len(path_parts) >= 4 and path_parts[0] == 'storage':
            # Use the date from the source path
            date_folder = f"{path_parts[1]}/{path_parts[2]}/{path_parts[3]}"
        else:
            # Fallback to today's date
            date_folder = datetime.now().strftime("%Y/%m/%d")
        
        clips_dir = STORAGE_DIR / date_folder / "clips"
        clips_dir.mkdir(parents=True, exist_ok=True)

        outputs: list[str] = []
        last_error: str | None = None
        if isinstance(clips, list) and clips:
            for idx, c in enumerate(clips, start=1):
                try:
                    s = float(c.get("start", 0))
                    e = float(c.get("end", 0))
                    if not (e > s >= 0):
                        continue
                    output_filename = f"trim_{s:.2f}-{e:.2f}_{datetime.now().strftime('%H%M%S')}_{idx}.mp4"
                    output_path = clips_dir / output_filename
                    # Fast cut using ffmpeg; fall back to re-encode if stream copy fails
                    try:
                        import subprocess
                        # Attempt stream copy (fast, keyframe aligned). Use arg list for Windows safety.
                        duration = max(e - s, 0.01)
                        cmd_copy = [
                            "ffmpeg", "-y", "-ss", str(s), "-i", str(input_full_path),
                            "-t", str(duration), "-c", "copy", "-movflags", "+faststart", str(output_path)
                        ]
                        ret = subprocess.run(cmd_copy, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                        # If stream copy failed or file missing/zero-sized, try re-encode
                        need_fallback = (
                            ret.returncode != 0
                            or not output_path.exists()
                            or (output_path.exists() and output_path.stat().st_size == 0)
                        )
                        if need_fallback:
                            # Ensure previous failed artifact is removed
                            try:
                                if output_path.exists():
                                    output_path.unlink()
                            except Exception:
                                pass
                            duration = max(e - s, 0.01)
                            cmd_encode = [
                                "ffmpeg", "-y", "-ss", str(s), "-i", str(input_full_path), "-t", str(duration),
                                "-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac", "-movflags", "+faststart", str(output_path)
                            ]
                            ret2 = subprocess.run(cmd_encode, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                            if ret2.returncode != 0 or not output_path.exists() or output_path.stat().st_size == 0:
                                # If encode also fails, record error and skip this clip
                                last_error = (ret2.stderr or ret2.stdout or "ffmpeg encode failed").strip()[:500]
                                continue
                    except Exception:
                        # If ffmpeg not available, skip this clip to avoid saving full original by mistake
                        last_error = "ffmpeg execution failed"
                        continue
                    outputs.append(str(output_path.relative_to(STORAGE_DIR)).replace('\\', '/'))
                except Exception:
                    continue
            if not outputs:
                msg = "No valid clips provided"
                if last_error:
                    msg += f": {last_error}"
                raise HTTPException(status_code=500, detail=msg)
            return {"success": True, "clips": outputs, "message": "Clips generated"}

        # Single clip fall-back (legacy)
        start_time = float(body.get("startTime", 0))
        end_time = float(body.get("endTime", 0))
        output_name = body.get("outputName", "trimmed")
        if not (end_time > start_time >= 0):
            raise HTTPException(status_code=400, detail="Invalid start/end times")
        output_filename = f"{output_name}_trim_{start_time:.2f}-{end_time:.2f}_{datetime.now().strftime('%H%M%S')}.mp4"
        output_path = clips_dir / output_filename
        shutil.copy2(input_full_path, output_path)
        return {"success": True, "clips": [str(output_path.relative_to(STORAGE_DIR)).replace('\\', '/')], "message": "Clip generated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error trimming video: {str(e)}")

@router.post("/youtube/client-secrets")
async def youtube_upload_client_secrets(file: UploadFile = File(...)):
    """Accept a single client_secret JSON file, persist it, and report status."""
    try:
        content = await file.read()
        text = content.decode("utf-8", errors="ignore")
        # basic validation
        data = json.loads(text)
        if not isinstance(data, dict):
            raise ValueError("Invalid JSON")
        _yt_service.save_client_secrets(json.dumps(data))
        return {"success": True, "configured": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid client secrets: {str(e)}")

@router.get("/youtube/auth-status")
async def youtube_auth_status():
    try:
        return _yt_service.auth_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/youtube/begin-auth")
async def youtube_begin_auth():
    """Kick off auth; will open a local server flow and persist token. Returns status after."""
    try:
        # Authenticate once; the service handles token refresh/persist
        service = _yt_service._authenticate_youtube()
        return {"success": True, **_yt_service.auth_status()}
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/clips-by-date")
async def get_clips_by_date():
    """Get video clips organized by date - only trimmed clips, not original videos"""
    try:
        if not STORAGE_DIR.exists():
            return {}
        
        clips_by_date: Dict[str, List[str]] = {}
        
        # Scan storage directory for video files, but only in clips folders
        for file_path in STORAGE_DIR.rglob("*"):
            if file_path.is_file() and file_path.suffix.lower() in ['.mp4', '.avi', '.mov', '.mkv']:
                # Only include files that are in clips folders (trimmed videos)
                # Skip original videos in the original folders
                path_str = str(file_path.relative_to(STORAGE_DIR)).replace('\\', '/')
                if '/clips/' in path_str and not '/original/' in path_str:
                    # Get file creation date
                    stat = file_path.stat()
                    creation_time = datetime.fromtimestamp(stat.st_ctime)
                    date_str = creation_time.strftime("%Y/%m/%d")
                    
                    if date_str not in clips_by_date:
                        clips_by_date[date_str] = []
                    clips_by_date[date_str].append(path_str)
        
        return clips_by_date
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error scanning clips: {str(e)}")

@router.post("/delete")
async def delete_clip(request: Request):
    """Delete a video clip"""
    try:
        body = await request.json()
        path = body.get("path")
        
        if not path:
            raise HTTPException(status_code=400, detail="Path is required")
        
        # Construct full path
        full_path = STORAGE_DIR / path
        
        # Security check - ensure path is within storage directory
        try:
            full_path.resolve().relative_to(STORAGE_DIR.resolve())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid path")
        
        if not full_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Delete the file
        full_path.unlink()
        
        return {"success": True, "message": "File deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")

@router.post("/delete-by-date")
async def delete_by_date(request: Request):
    """Delete all clips for a specific date (YYYY/MM/DD or YYYY-MM-DD),
    matching the same grouping logic as /video/clips-by-date (by file ctime)."""
    try:
        body = await request.json()
        date_str = str(body.get("date", "")).strip()
        if not date_str:
            raise HTTPException(status_code=400, detail="date is required")

        # Normalize incoming formats to YYYY/MM/DD
        normalized = date_str.replace("-", "/")
        parts = normalized.split("/")
        if len(parts) != 3 or not all(p.isdigit() for p in parts):
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY/MM/DD")

        # Scan all clips and delete those whose ctime date matches
        from datetime import datetime
        deleted = 0
        for file_path in STORAGE_DIR.rglob("*"):
            try:
                if (
                    file_path.is_file()
                    and file_path.suffix.lower() in [".mp4", ".mov", ".mkv", ".webm", ".avi"]
                ):
                    path_str = str(file_path).replace("\\", "/")
                    if "/clips/" not in path_str or "/original/" in path_str:
                        continue
                    stat = file_path.stat()
                    creation_time = datetime.fromtimestamp(stat.st_ctime)
                    date_key = creation_time.strftime("%Y/%m/%d")
                    if date_key == normalized:
                        file_path.unlink()
                        deleted += 1
            except Exception:
                continue

        return {"success": True, "deleted": deleted}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting by date: {str(e)}")

@router.get("/facebook/pages")
async def facebook_pages(access_token: str):
    """Proxy to quickly resolve Facebook pages for a user access token.
    Returns data from Graph API /me/accounts.
    """
    try:
        if not access_token:
            raise HTTPException(status_code=400, detail="access_token is required")
        url = f"https://graph.facebook.com/v17.0/me/accounts?access_token={access_token}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8", errors="ignore")
            data = json.loads(body)
            return data
    except urllib.error.HTTPError as e:
        try:
            detail = e.read().decode("utf-8", errors="ignore")
        except Exception:
            detail = str(e)
        raise HTTPException(status_code=e.code or 500, detail=detail)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/facebook/post")
async def facebook_post(request: Request):
    """Post to a Facebook Page using a Page access token.
    Supports text-only, image (photo) by URL, and video by URL.
    Body: { access_token, page_id, title, description, media_path }
    """
    try:
        body = await request.json()
        access_token = str(body.get("access_token", "")).strip()
        page_id = str(body.get("page_id", "")).strip()
        title = str(body.get("title", "")).strip()
        description = str(body.get("description", "")).strip()
        media_path = str(body.get("media_path", "")).strip()
        if not (access_token and page_id):
            raise HTTPException(status_code=400, detail="access_token and page_id are required")

        message = title if title else ""
        if description:
            message = f"{message}\n\n{description}" if message else description

        base = request.url.replace(path="").replace(query="").replace(fragment="")._url.rstrip('/')
        media_url = None
        if media_path:
            cleaned = media_path.replace("\\", "/").replace("storage/", "")
            media_url = f"{base}/video/media/{cleaned}"

        def http_post(url: str, params: Dict[str, str]) -> Dict[str, Any]:
            data = urllib.parse.urlencode(params).encode("utf-8")
            req = urllib.request.Request(url, data=data)
            with urllib.request.urlopen(req, timeout=20) as resp:
                txt = resp.read().decode("utf-8", errors="ignore")
                return json.loads(txt)

        # Decide endpoint
        graph_base = "https://graph.facebook.com/v17.0"
        result: Dict[str, Any] = {}
        if media_url and media_url.lower().endswith((".jpg",".jpeg",".png",".gif",".webp")):
            # Photo post
            url = f"{graph_base}/{page_id}/photos"
            params = {"access_token": access_token, "url": media_url}
            if message:
                params["caption"] = message
            result = http_post(url, params)
        elif media_url and media_url.lower().endswith((".mp4",".mov",".mkv",".webm",".avi")):
            # Video post by file_url
            url = f"{graph_base}/{page_id}/videos"
            params = {"access_token": access_token, "file_url": media_url}
            if message:
                params["description"] = message
            result = http_post(url, params)
        else:
            # Text-only feed post
            url = f"{graph_base}/{page_id}/feed"
            if not message:
                raise HTTPException(status_code=400, detail="message is required for text-only post")
            params = {"access_token": access_token, "message": message}
            result = http_post(url, params)

        if "error" in result:
            raise HTTPException(status_code=502, detail=result)
        return {"success": True, "result": result}
    except urllib.error.HTTPError as e:
        try:
            detail = e.read().decode("utf-8", errors="ignore")
        except Exception:
            detail = str(e)
        raise HTTPException(status_code=e.code or 500, detail=detail)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/caption-legacy")
async def generate_caption_legacy(request: Request):
    """Generate caption for a video"""
    try:
        body = await request.json()
        path = body.get("path")
        seed = body.get("seed", 0)
        
        if not path:
            raise HTTPException(status_code=400, detail="Path is required")
        # Legacy: direct Gemini without transcript (kept for backward compatibility)
        filename = os.path.basename(path)
        data = generate_caption_and_title(filename=filename, transcript=None, seed=seed)
        return {
            "title": data.get("title", ""),
            "caption": data.get("caption", ""),
            "hashtags": data.get("hashtags", "")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating caption: {str(e)}")

@router.post("/publish-youtube")
async def publish_to_youtube(request: Request):
    """Publish video to YouTube"""
    try:
        body = await request.json()
        path = body.get("path")
        title = body.get("title", "")
        description = body.get("description", "")
        hashtags = body.get("hashtags", "")
        privacy = body.get("privacy", "private")
        
        if not path:
            raise HTTPException(status_code=400, detail="Path is required")
        
        # Construct full path
        full_path = STORAGE_DIR / path
        
        if not full_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Prepare minimal video_info
        video_info = {
            "title": os.path.splitext(os.path.basename(str(full_path)))[0],
            "topic": "video",
            "privacy": privacy,
        }
        # Combine description with hashtags
        caption_for_upload = f"{description}\n\n{hashtags}".strip()
        
        # Use actual YouTubeService (OAuth flow via client_secrets.json)
        yt_service = YouTubeService(Database())
        result = yt_service.upload_video(str(full_path), video_info, caption_for_upload)
        if not result.get("success"):
            raise HTTPException(status_code=502, detail=result.get("error", "YouTube upload failed"))
        return {
            "success": True,
            "message": result.get("message", "Uploaded"),
            "video_id": result.get("video_id"),
            "url": result.get("video_url"),
            "title": result.get("title"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error publishing to YouTube: {str(e)}")

@router.get("/media/{path:path}")
async def serve_media(path: str):
    """Serve media files"""
    try:
        # Construct full path
        full_path = STORAGE_DIR / path
        
        # Security check - ensure path is within storage directory
        try:
            full_path.resolve().relative_to(STORAGE_DIR.resolve())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid path")
        
        if not full_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(full_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving file: {str(e)}")
