"""
Caption generation service
"""

import random
from typing import Dict, List, Optional
from pathlib import Path

from backend.models.database import Database
from backend.models.video_info import VideoInfo, CaptionTemplate, CaptionResult
from backend.utils.config import Config

class CaptionService:
    """Service for generating video captions"""
    
    def __init__(self, database: Database):
        self.db = database
        self.templates = self._load_templates()
    
    def _load_templates(self) -> Dict[str, CaptionTemplate]:
        """Load caption templates for different video types"""
        return {
            "ai_tech": CaptionTemplate(
                hook_patterns=[
                    "Can AI help {topic} make better decisions?",
                    "Stop scrolling—this will 10x your {topic} skills.",
                    "Everyone's missing this one step in {topic}.",
                    "From {problem} to {solution}: AI that actually works.",
                    "Make {complex_topic} simple in 60 seconds."
                ],
                value_patterns=[
                    "In this video, I break down {topic} and show you exactly how it works. You'll learn the framework, see real examples, and get actionable steps you can apply today.",
                    "I'll reveal the exact method I use to {action} without {common_problem}. It's fast, repeatable, and perfect for real-world use.",
                    "Learn how {topic} works from the ground up. I demo the pipeline, explain the key concepts, and give you a template to try it yourself.",
                    "This walkthrough covers {topic} step-by-step. No jargon—just what works and how to implement it in your own projects."
                ],
                cta_patterns=[
                    "👉 Follow for more AI/ML insights and practical breakdowns!",
                    "👉 Like, share, and follow for hands-on AI systems explained simply.",
                    "👉 Comment '{keyword}' if you want the code breakdown next!",
                    "👉 Save this post and share it with a teammate who needs it.",
                    "👉 Follow for weekly templates and quick wins."
                ],
                hashtag_sets=[
                    ["#AI", "#MachineLearning", "#DeepLearning", "#ComputerVision", "#DataScience", "#Innovation", "#TechForGood", "#FutureOfWork", "#AIProjects", "#ArtificialIntelligence", "#WatchTillEnd"],
                    ["#AI", "#MachineLearning", "#RealTimeAI", "#ComputerVision", "#DataScience", "#SafetyCritical", "#DeepLearning", "#AIProjects", "#Innovation", "#TechForGood", "#EdgeAI", "#WatchTillEnd"],
                    ["#AI", "#Technology", "#Innovation", "#Learning", "#DataScience", "#Tips", "#HowTo", "#Workflow", "#Automation", "#Efficiency", "#WatchTillEnd", "#Creators", "#BuildSmarter"]
                ]
            ),
            "tutorial": CaptionTemplate(
                hook_patterns=[
                    "Stop struggling with {topic}—here's the fix.",
                    "This {topic} trick will save you hours.",
                    "Why everyone gets {topic} wrong (and how to do it right).",
                    "The {topic} method that actually works."
                ],
                value_patterns=[
                    "I'll show you the exact steps to {action} without the common mistakes. You'll see the before/after and get a template you can use immediately.",
                    "In this tutorial, I break down {topic} from start to finish. No fluff—just the essential steps that get results.",
                    "Learn the {topic} framework that professionals use. I'll walk you through each step with real examples."
                ],
                cta_patterns=[
                    "👉 Follow for more practical tutorials like this!",
                    "👉 Save this and try it on your next project!",
                    "👉 Comment if you want more {topic} tips!"
                ],
                hashtag_sets=[
                    ["#Tutorial", "#HowTo", "#Learning", "#Tips", "#Productivity", "#Skills", "#Education", "#DIY", "#Guide", "#StepByStep", "#WatchTillEnd"]
                ]
            ),
            "general": CaptionTemplate(
                hook_patterns=[
                    "You need to see this {topic} breakthrough.",
                    "This changes everything about {topic}.",
                    "The {topic} secret nobody talks about.",
                    "Why {topic} is about to get way easier."
                ],
                value_patterns=[
                    "In this video, I share {topic} insights that will transform how you think about {related_topic}. You'll learn the key principles and see practical applications.",
                    "I break down {topic} in a way that makes complex concepts simple. Perfect for anyone looking to understand {related_topic} better.",
                    "This video covers {topic} from multiple angles. You'll get actionable insights and a fresh perspective on {related_topic}."
                ],
                cta_patterns=[
                    "👉 Follow for more insights like this!",
                    "👉 Share this with someone who needs to see it!",
                    "👉 Comment your thoughts below!"
                ],
                hashtag_sets=[
                    ["#Insights", "#Learning", "#Knowledge", "#Education", "#Tips", "#Innovation", "#Growth", "#Mindset", "#Success", "#Motivation", "#WatchTillEnd"]
                ]
            )
        }
    
    def _create_video_id(self, video_info: VideoInfo) -> str:
        """Create unique ID for video"""
        return f"{video_info.title}_{video_info.topic}".replace(" ", "_").lower()
    
    def _generate_caption(self, video_info: VideoInfo, template_type: str = "ai_tech") -> str:
        """Generate caption using template system"""
        template = self.templates[template_type]
        
        # Select random patterns
        hook = random.choice(template.hook_patterns)
        value = random.choice(template.value_patterns)
        cta = random.choice(template.cta_patterns)
        hashtags = random.choice(template.hashtag_sets)
        
        # Fill in template variables
        context = {
            "topic": video_info.topic,
            "action": f"master {video_info.topic}",
            "common_problem": "getting overwhelmed",
            "complex_topic": video_info.topic,
            "problem": "confusion",
            "solution": "clarity",
            "related_topic": video_info.topic,
            "keyword": "DEMO"
        }
        
        # Simple template substitution
        for key, val in context.items():
            hook = hook.replace(f"{{{key}}}", val)
            value = value.replace(f"{{{key}}}", val)
            cta = cta.replace(f"{{{key}}}", val)
        
        # Format final caption
        caption = f"{hook}\n\n{value}\n\n{cta}\n\n{' '.join(hashtags)}"
        return caption
    
    def generate_caption_for_video(self, video_info: VideoInfo, template_type: str = "ai_tech") -> CaptionResult:
        """Generate caption for a single video"""
        try:
            video_id = self._create_video_id(video_info)
            
            # Check if already has caption
            if self.db.has_caption(video_id):
                return CaptionResult(
                    video_title=video_info.title,
                    caption="",
                    template_type=template_type,
                    success=False,
                    error_message="Video already has caption"
                )
            
            # Generate caption
            caption = self._generate_caption(video_info, template_type)
            
            # Save to database
            caption_data = {
                "title": video_info.title,
                "caption": caption,
                "template_type": template_type,
                "generated_at": self._get_timestamp()
            }
            
            self.db.save_caption(video_id, caption_data)
            
            return CaptionResult(
                video_title=video_info.title,
                caption=caption,
                template_type=template_type,
                success=True
            )
            
        except Exception as e:
            return CaptionResult(
                video_title=video_info.title,
                caption="",
                template_type=template_type,
                success=False,
                error_message=str(e)
            )
    
    def generate_captions_for_directory(self, directory: str, template_type: str = "ai_tech") -> Dict[str, str]:
        """Generate captions for all videos in directory"""
        from backend.services.video_service import VideoService
        
        video_service = VideoService(self.db)
        videos = video_service.scan_videos(directory)
        
        results = {}
        
        for video in videos:
            if not video.has_caption:  # Skip videos that already have captions
                result = self.generate_caption_for_video(video, template_type)
                if result.success:
                    results[video.title] = result.caption
                    # Save caption to file
                    self._save_caption_to_file(video, result.caption)
        
        return results
    
    def regenerate_caption(self, video_title: str, template_type: str = "ai_tech") -> Optional[str]:
        """Regenerate caption for specific video"""
        # Delete existing caption
        self.delete_caption(video_title)
        
        # Find video and regenerate
        from backend.services.video_service import VideoService
        video_service = VideoService(self.db)
        videos = video_service.scan_videos(".")
        
        for video in videos:
            if video.title == video_title:
                result = self.generate_caption_for_video(video, template_type)
                if result.success:
                    self._save_caption_to_file(video, result.caption)
                    return result.caption
        
        return None
    
    def delete_caption(self, video_title: str) -> bool:
        """Delete caption for a video"""
        # Find video ID
        from backend.services.video_service import VideoService
        video_service = VideoService(self.db)
        videos = video_service.scan_videos(".")
        
        for video in videos:
            if video.title == video_title:
                video_id = self._create_video_id(video)
                return self.db.delete_caption(video_id)
        
        return False
    
    def list_captioned_videos(self) -> List[str]:
        """List all videos that have captions"""
        captions = self.db.list_captions()
        return list(captions.keys())
    
    def _save_caption_to_file(self, video: VideoInfo, caption: str):
        """Save caption to file alongside video"""
        if not video.file_path:
            return
        
        video_path = Path(video.file_path)
        caption_file = video_path.parent / f"{video_path.stem}.caption"
        
        try:
            with open(caption_file, 'w', encoding='utf-8') as f:
                f.write(caption)
        except Exception as e:
            print(f"Error saving caption: {e}")
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()
