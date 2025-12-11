"""
Caption management router
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from backend.services.caption_service import CaptionService
from backend.models.database import Database

router = APIRouter(prefix="/api/captions", tags=["captions"])

# Initialize services
db = Database()
caption_service = CaptionService(db)

class VideoRequest(BaseModel):
    directory: str = "."
    template: str = "ai_tech"

class CaptionRequest(BaseModel):
    video_title: str
    template: str = "ai_tech"

@router.post("/generate")
async def generate_captions(request: VideoRequest):
    """Generate captions for videos"""
    try:
        results = caption_service.generate_captions_for_directory(
            request.directory, request.template
        )
        return {
            "success": True,
            "results": results,
            "generated_count": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/regenerate")
async def regenerate_caption(request: CaptionRequest):
    """Regenerate caption for specific video"""
    try:
        caption = caption_service.regenerate_caption(request.video_title, request.template)
        
        if caption:
            return {
                "success": True,
                "caption": caption
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to regenerate caption")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete")
async def delete_caption(request: CaptionRequest):
    """Delete caption for specific video"""
    try:
        success = caption_service.delete_caption(request.video_title)
        return {
            "success": success,
            "message": "Caption deleted" if success else "Caption not found"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_captions():
    """List all videos with captions"""
    try:
        captions = caption_service.list_captioned_videos()
        return {
            "success": True,
            "captions": captions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
