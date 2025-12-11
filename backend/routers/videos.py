"""
Video management router
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any
from backend.services.video_service import VideoService
from backend.models.database import Database

router = APIRouter(prefix="/api/videos", tags=["videos"])

# Initialize services
db = Database()
video_service = VideoService(db)

@router.get("/")
async def get_videos(directory: str = Query(default=".", description="Directory to scan for videos")):
    """Get all videos and their caption status"""
    try:
        videos = video_service.scan_videos(directory)
        return {
            "success": True,
            "videos": [video.to_dict() for video in videos],
            "count": len(videos)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_video_status(directory: str = Query(default=".", description="Directory to scan for videos")):
    """Get detailed status of all videos"""
    try:
        status = video_service.get_video_status(directory)
        return {
            "success": True,
            "status": status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
