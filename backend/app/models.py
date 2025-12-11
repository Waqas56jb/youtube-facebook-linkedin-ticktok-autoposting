from pydantic import BaseModel
from typing import List, Optional, Literal


class StoryRequest(BaseModel):
    text: str
    format: Optional[Literal["lucy", "narrative", "business", "motivational"]] = None
    useCustomPrompt: Optional[bool] = None
    customPrompt: Optional[str] = None


class TranscriptSegment(BaseModel):
    start: Optional[float] = None
    end: Optional[float] = None
    text: str


class TranscriptResponse(BaseModel):
    kind: Literal["media", "document"]
    transcript: str
    segments: List[TranscriptSegment]
    language: Optional[str] = None
    duration: Optional[float] = None


