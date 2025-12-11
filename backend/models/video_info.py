"""
Video information models
"""

from dataclasses import dataclass
from typing import Optional, List
from pathlib import Path

@dataclass
class VideoInfo:
    """Video metadata structure"""
    title: str
    description: str
    topic: str
    file_path: Optional[str] = None
    duration: Optional[str] = None
    size: Optional[int] = None
    has_caption: bool = False
    caption_file_path: Optional[str] = None
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "title": self.title,
            "description": self.description,
            "topic": self.topic,
            "file_path": self.file_path,
            "duration": self.duration,
            "size": self.size,
            "has_caption": self.has_caption,
            "caption_file_path": self.caption_file_path
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'VideoInfo':
        """Create from dictionary"""
        return cls(**data)

@dataclass
class CaptionTemplate:
    """Caption template structure"""
    hook_patterns: List[str]
    value_patterns: List[str]
    cta_patterns: List[str]
    hashtag_sets: List[List[str]]
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            "hook_patterns": self.hook_patterns,
            "value_patterns": self.value_patterns,
            "cta_patterns": self.cta_patterns,
            "hashtag_sets": self.hashtag_sets
        }

@dataclass
class CaptionResult:
    """Result of caption generation"""
    video_title: str
    caption: str
    template_type: str
    success: bool
    error_message: Optional[str] = None
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            "video_title": self.video_title,
            "caption": self.caption,
            "template_type": self.template_type,
            "success": self.success,
            "error_message": self.error_message
        }
