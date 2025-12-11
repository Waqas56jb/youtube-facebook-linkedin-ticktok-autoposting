"""
Video management service
"""

import os
import re
from typing import List, Dict, Optional
from pathlib import Path

from backend.models.database import Database
from backend.models.video_info import VideoInfo
from backend.utils.config import Config

class VideoService:
    """Service for managing video files"""
    
    def __init__(self, database: Database):
        self.db = database
        self.supported_formats = Config.SUPPORTED_VIDEO_FORMATS
        self.caption_extensions = Config.CAPTION_EXTENSIONS
    
    def scan_videos(self, directory: str = ".") -> List[VideoInfo]:
        """Scan directory for video files and extract metadata"""
        videos = []
        video_directory = Path(directory)
        
        if not video_directory.exists():
            return videos
        
        for file_path in video_directory.rglob("*"):
            if file_path.suffix.lower() in self.supported_formats:
                video_info = self._extract_video_info(file_path)
                if video_info:
                    videos.append(video_info)
        
        return videos
    
    def _extract_video_info(self, file_path: Path) -> Optional[VideoInfo]:
        """Extract video information from file"""
        try:
            # Get basic file info
            title = file_path.stem
            description = f"Video file: {file_path.name}"
            
            # Try to extract topic from filename
            topic = self._extract_topic_from_filename(title)
            
            # Check if video already has caption files
            has_caption, caption_file_path = self._check_caption_file(file_path)
            
            # Get file size
            file_size = file_path.stat().st_size if file_path.exists() else None
            
            return VideoInfo(
                title=title,
                description=description,
                topic=topic,
                file_path=str(file_path),
                size=file_size,
                has_caption=has_caption,
                caption_file_path=caption_file_path
            )
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
            return None
    
    def _extract_topic_from_filename(self, filename: str) -> str:
        """Extract topic from filename using common patterns"""
        # Clean filename
        clean_name = re.sub(r'[_-]', ' ', filename)
        clean_name = re.sub(r'\d+', '', clean_name)  # Remove numbers
        clean_name = clean_name.strip()
        
        # Topic mapping based on keywords
        topic_keywords = {
            'ai': 'artificial intelligence',
            'ml': 'machine learning',
            'pilot': 'pilot decision-making',
            'tutorial': 'tutorial',
            'guide': 'guide',
            'tips': 'tips and tricks',
            'review': 'product review',
            'demo': 'demonstration',
            'coding': 'programming',
            'tech': 'technology',
            'data': 'data science',
            'vision': 'computer vision',
            'deep': 'deep learning',
            'neural': 'neural networks'
        }
        
        # Find matching keywords
        for keyword, topic in topic_keywords.items():
            if keyword.lower() in clean_name.lower():
                return topic
        
        # Default topic
        return clean_name.lower() or "general content"
    
    def _check_caption_file(self, video_path: Path) -> tuple[bool, Optional[str]]:
        """Check if video already has caption files"""
        base_name = video_path.stem
        
        for ext in self.caption_extensions:
            caption_file = video_path.parent / f"{base_name}{ext}"
            if caption_file.exists():
                return True, str(caption_file)
        
        return False, None
    
    def get_video_status(self, directory: str = ".") -> Dict[str, Dict]:
        """Get detailed status of all videos"""
        videos = self.scan_videos(directory)
        status = {}
        
        for video in videos:
            has_file_caption = video.has_caption
            has_db_caption = self._check_db_caption(video)
            
            status[video.title] = {
                "file_path": video.file_path,
                "topic": video.topic,
                "size": video.size,
                "has_caption_file": has_file_caption,
                "has_caption_in_db": has_db_caption,
                "caption_file_path": video.caption_file_path,
                "status": "✅ Complete" if (has_file_caption and has_db_caption) else "⏳ Needs caption"
            }
        
        return status
    
    def _check_db_caption(self, video: VideoInfo) -> bool:
        """Check if video has caption in database"""
        from backend.services.caption_service import CaptionService
        caption_service = CaptionService(self.db)
        video_id = caption_service._create_video_id(video)
        return self.db.has_caption(video_id)
    
    def cleanup_orphaned_captions(self, directory: str = ".") -> int:
        """Remove caption files that don't have corresponding videos"""
        video_directory = Path(directory)
        removed_count = 0
        
        for file_path in video_directory.rglob("*"):
            if file_path.suffix.lower() in self.caption_extensions:
                # Check if corresponding video exists
                base_name = file_path.stem
                video_exists = False
                
                for ext in self.supported_formats:
                    video_file = file_path.parent / f"{base_name}{ext}"
                    if video_file.exists():
                        video_exists = True
                        break
                
                if not video_exists:
                    try:
                        file_path.unlink()
                        removed_count += 1
                    except Exception as e:
                        print(f"Error removing {file_path}: {e}")
        
        return removed_count
    
    def get_video_stats(self, directory: str = ".") -> Dict[str, int]:
        """Get statistics about videos in directory"""
        videos = self.scan_videos(directory)
        
        total_videos = len(videos)
        videos_with_captions = sum(1 for v in videos if v.has_caption)
        videos_without_captions = total_videos - videos_with_captions
        
        return {
            "total_videos": total_videos,
            "videos_with_captions": videos_with_captions,
            "videos_without_captions": videos_without_captions,
            "completion_percentage": round((videos_with_captions / total_videos * 100) if total_videos > 0 else 0, 1)
        }
