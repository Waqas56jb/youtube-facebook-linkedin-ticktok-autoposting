"""
Transcript and story generation router
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request
from typing import Dict, List, Any
import json

router = APIRouter(prefix="/transcript", tags=["transcript"])

@router.post("/file")
async def upload_transcript_file(file: UploadFile = File(...)):
    """Upload a file for transcription"""
    try:
        # Mock transcription response
        # In a real implementation, you would use a transcription service
        return {
            "kind": "media",
            "transcript": "This is a mock transcript of the uploaded file.",
            "segments": [
                {"start": 0, "end": 5, "text": "This is a mock transcript"},
                {"start": 5, "end": 10, "text": "of the uploaded file."}
            ],
            "language": "en",
            "duration": 10.0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@router.post("/manual")
async def submit_manual_transcript(text: str = Form(...)):
    """Submit manual transcript text"""
    try:
        return {
            "transcript": text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing manual transcript: {str(e)}")

# Story generation router
story_router = APIRouter(prefix="/story", tags=["story"])

@story_router.post("/generate")
async def generate_story(request: Request):
    """Generate a story from text"""
    try:
        body = await request.json()
        text = body.get("text", "")
        
        # Mock story generation
        # In a real implementation, you would use an AI service
        story = f"Once upon a time, there was a story about: {text[:100]}... This is a mock story generated from the provided text."
        
        return {
            "story": story
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating story: {str(e)}")
