"""
Database models and operations for Video Caption Generator
"""

import os
import json
from typing import Dict, List, Optional, Any
from pathlib import Path
from datetime import datetime

class Database:
    """Simple JSON-based database for storing caption data"""
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or "data/captions_database.json"
        self._ensure_db_exists()
    
    def _ensure_db_exists(self):
        """Ensure database file and directory exist"""
        db_path = Path(self.db_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        
        if not db_path.exists():
            self._create_empty_db()
    
    def _create_empty_db(self):
        """Create empty database structure"""
        empty_db = {
            "captions": {},
            "metadata": {
                "created_at": datetime.now().isoformat(),
                "version": "1.0.0"
            }
        }
        self._save_db(empty_db)
    
    def _load_db(self) -> Dict[str, Any]:
        """Load database from file"""
        try:
            with open(self.db_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            self._create_empty_db()
            return self._load_db()
    
    def _save_db(self, data: Dict[str, Any]):
        """Save database to file"""
        with open(self.db_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    def get_caption(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Get caption data for a video"""
        db = self._load_db()
        return db["captions"].get(video_id)
    
    def save_caption(self, video_id: str, caption_data: Dict[str, Any]) -> bool:
        """Save caption data for a video"""
        try:
            db = self._load_db()
            db["captions"][video_id] = {
                **caption_data,
                "updated_at": datetime.now().isoformat()
            }
            self._save_db(db)
            return True
        except Exception:
            return False
    
    def delete_caption(self, video_id: str) -> bool:
        """Delete caption data for a video"""
        try:
            db = self._load_db()
            if video_id in db["captions"]:
                del db["captions"][video_id]
                self._save_db(db)
                return True
            return False
        except Exception:
            return False
    
    def list_captions(self) -> Dict[str, Dict[str, Any]]:
        """List all captions"""
        db = self._load_db()
        return db["captions"]
    
    def has_caption(self, video_id: str) -> bool:
        """Check if video has caption"""
        db = self._load_db()
        return video_id in db["captions"]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        db = self._load_db()
        captions = db["captions"]
        
        return {
            "total_captions": len(captions),
            "templates_used": list(set(
                caption.get("template_type", "unknown") 
                for caption in captions.values()
            )),
            "last_updated": max(
                (caption.get("updated_at", caption.get("generated_at", "")) 
                 for caption in captions.values()),
                default=""
            )
        }
