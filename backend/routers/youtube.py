"""
YouTube integration router
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from backend.services.youtube_service import YouTubeService
from backend.services.video_service import VideoService
from backend.models.database import Database

router = APIRouter(prefix="/api/youtube", tags=["youtube"])

# Initialize services
db = Database()
youtube_service = YouTubeService(db)
video_service = VideoService(db)

class YouTubeUploadRequest(BaseModel):
    video_title: str
    caption: str

@router.get("/auth/status")
async def youtube_auth_status():
    """Check YouTube authentication status"""
    try:
        status = youtube_service.check_authentication_status()
        return {
            "success": True,
            "status": status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/initiate")
async def youtube_auth_initiate():
    """Initiate YouTube authentication flow"""
    try:
        # This will trigger the OAuth flow
        youtube = youtube_service._authenticate_youtube()
        return {
            "success": True,
            "message": "Authentication completed successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def youtube_upload(request: YouTubeUploadRequest):
    """Upload video to YouTube"""
    try:
        # Find video file
        videos = video_service.scan_videos(".")
        target_video = None
        
        for video in videos:
            if video.title == request.video_title:
                target_video = video
                break
        
        if not target_video or not target_video.file_path:
            raise HTTPException(status_code=404, detail="Video file not found")
        
        # Upload to YouTube
        result = youtube_service.upload_video(
            target_video.file_path,
            target_video.to_dict(),
            request.caption
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/uploads")
async def youtube_uploads():
    """Get YouTube upload history"""
    try:
        uploads = youtube_service.get_upload_history()
        return {
            "success": True,
            "uploads": uploads
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/revoke")
async def youtube_revoke_auth():
    """Revoke YouTube authentication"""
    try:
        success = youtube_service.revoke_credentials()
        return {
            "success": success,
            "message": "Authentication revoked" if success else "Failed to revoke authentication"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
