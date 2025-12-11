"""
Utility routes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.services.video_service import VideoService
from backend.models.database import Database

router = APIRouter(prefix="/api", tags=["utils"])

# Initialize services
db = Database()
video_service = VideoService(db)

class CleanupRequest(BaseModel):
    directory: str = "."

@router.post("/cleanup")
async def cleanup_orphaned(request: CleanupRequest):
    """Clean up orphaned caption files"""
    try:
        removed_count = video_service.cleanup_orphaned_captions(request.directory)
        return {
            "success": True,
            "removed_count": removed_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
