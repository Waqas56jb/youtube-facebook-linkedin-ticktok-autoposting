"""
YouTube integration service for video uploads
"""

import os
import json
import pickle
from typing import Optional, Dict, Any
from pathlib import Path
from datetime import datetime, timedelta

import google_auth_httplib2
import google_auth_oauthlib
import googleapiclient.discovery
import googleapiclient.errors
import googleapiclient.http
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleAuthRequest

from backend.models.database import Database
import re
from backend.utils.config import Config

class YouTubeService:
    """Service for YouTube video uploads with OAuth2 authentication"""
    
    # YouTube API scopes
    SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
    
    def __init__(self, database: Database):
        self.db = database
        self.credentials_file = "client_secrets.json"
        self.token_file = "data/token.json"
        self.service = None
        self._ensure_token_directory()
    
    def _ensure_token_directory(self):
        """Ensure token directory exists"""
        token_path = Path(self.token_file)
        token_path.parent.mkdir(parents=True, exist_ok=True)
    
    def save_client_secrets(self, json_text: str) -> None:
        """Persist provided client secret JSON to the expected path."""
        Path(self.credentials_file).parent.mkdir(parents=True, exist_ok=True)
        with open(self.credentials_file, "w", encoding="utf-8") as f:
            f.write(json_text)

    def auth_status(self) -> Dict[str, Any]:
        """Return current auth status; refresh token if possible."""
        status: Dict[str, Any] = {"configured": os.path.exists(self.credentials_file), "authenticated": False}
        try:
            if os.path.exists(self.token_file):
                creds = Credentials.from_authorized_user_file(self.token_file, scopes=self.SCOPES)
                if creds and creds.expired and creds.refresh_token:
                    try:
                        creds.refresh(GoogleAuthRequest())
                        with open(self.token_file, "w", encoding="utf-8") as token_out:
                            token_out.write(creds.to_json())
                    except Exception:
                        pass
                status.update({
                    "authenticated": bool(creds and creds.valid),
                    "expiry": getattr(creds, "expiry", None).isoformat() if getattr(creds, "expiry", None) else None,
                    "has_refresh_token": bool(getattr(creds, "refresh_token", None))
                })
        except Exception:
            pass
        return status

    def _authenticate_youtube(self):
        """Authenticate with YouTube API using the working method"""
        # Set insecure transport for local development
        os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

        creds: Optional[Credentials] = None
        # Try loading existing token and refresh if needed
        if os.path.exists(self.token_file):
            try:
                creds = Credentials.from_authorized_user_file(self.token_file, scopes=self.SCOPES)
            except Exception:
                creds = None

        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(GoogleAuthRequest())
                # Persist refreshed token
                Path(self.token_file).parent.mkdir(parents=True, exist_ok=True)
                with open(self.token_file, "w", encoding="utf-8") as token_out:
                    token_out.write(creds.to_json())
            except Exception:
                creds = None

        if not creds or not creds.valid:
            # Fresh auth flow
            if not os.path.exists(self.credentials_file):
                raise FileNotFoundError(f"Credentials file {self.credentials_file} not found")
            flow = google_auth_oauthlib.flow.InstalledAppFlow.from_client_secrets_file(
                self.credentials_file, self.SCOPES
            )
            # Request offline access to retain refresh token
            creds = flow.run_local_server(port=0, access_type="offline", prompt="consent")
            # Save new token
            Path(self.token_file).parent.mkdir(parents=True, exist_ok=True)
            with open(self.token_file, "w", encoding="utf-8") as token_out:
                token_out.write(creds.to_json())

        youtube = googleapiclient.discovery.build("youtube", "v3", credentials=creds)
        return youtube
    
    def _generate_video_title(self, video_info: Dict[str, Any], caption: str) -> str:
        """Generate YouTube video title from caption"""
        # Extract hook from caption (first line)
        lines = caption.strip().split('\n')
        hook = lines[0] if lines else video_info.get('title', 'Video')
        
        # Clean up the hook for title
        title = hook.replace('?', '').replace('!', '').strip()
        
        # Limit title length (YouTube max is 100 characters)
        if len(title) > 100:
            title = title[:97] + "..."
        
        return title
    
    def _generate_video_description(self, caption: str, video_info: Dict[str, Any]) -> str:
        """Generate YouTube video description: strictly the provided caption only.
        Removes any accidental generator signatures or boilerplate blocks.
        """
        text = caption.strip()
        # Remove common boilerplate/sig blocks if present
        patterns = [
            r"^📝 About this video:[\s\S]*?$(?:\n[\s\S]*)?",
            r"^🔖 Timestamps:[\s\S]*?(?:\n\n|$)",
            r"^📚 Related Topics:[\s\S]*?(?:\n\n|$)",
            r"^👍 If you found this helpful,[\s\S]*?(?:\n\n|$)",
            r"^---\s*Generated by.*$",
        ]
        for pat in patterns:
            text = re.sub(pat, "", text, flags=re.MULTILINE)
        # Collapse excessive blank lines
        text = re.sub(r"\n{3,}", "\n\n", text).strip()
        return text
    
    def _generate_video_tags(self, video_info: Dict[str, Any], caption: str) -> list:
        """Generate YouTube video tags strictly from caption hashtags only."""
        tags_from_caption: list[str] = []
        for line in caption.split('\n'):
            if line.strip().startswith('#'):
                tags_from_caption.extend([t.strip('#') for t in line.strip().split() if t.startswith('#')])
        # Remove duplicates, keep order, limit to 15 (YouTube limit)
        unique_tags = list(dict.fromkeys(tags_from_caption))[:15]
        return unique_tags
    
    def upload_video(self, video_path: str, video_info: Dict[str, Any], caption: str) -> Dict[str, Any]:
        """Upload video to YouTube with generated title and description"""
        try:
            # Get authenticated service
            youtube = self._authenticate_youtube()
            
            # Generate metadata
            title = self._generate_video_title(video_info, caption)
            description = self._generate_video_description(caption, video_info)
            tags = self._generate_video_tags(video_info, caption)
            
            # Determine privacy status
            desired_privacy = str(video_info.get('privacy', 'private')).lower()
            if desired_privacy not in {'public', 'private', 'unlisted'}:
                desired_privacy = 'private'

            # Video metadata - using the working format
            request_body = {
                "snippet": {
                    "categoryId": "28",  # Science & Technology category
                    "title": title,
                    "description": description,
                    "tags": tags
                },
                "status": {
                    "privacyStatus": desired_privacy
                }
            }
            
            # Create media upload - using the working format
            media_file = googleapiclient.http.MediaFileUpload(
                video_path, 
                chunksize=-1, 
                resumable=True
            )
            
            # Upload video - using the working format
            request = youtube.videos().insert(
                part="snippet,status",
                body=request_body,
                media_body=media_file
            )
            
            # Execute upload
            response = None
            while response is None:
                status, response = request.next_chunk()
                if status:
                    print(f"Upload {int(status.progress() * 100)}%")
            
            if 'id' in response:
                video_id = response['id']
                video_url = f"https://www.youtube.com/watch?v={video_id}"
                
                # Save upload info to database
                self._save_upload_info(video_info, video_id, video_url, title)
                
                return {
                    'success': True,
                    'video_id': video_id,
                    'video_url': video_url,
                    'title': title,
                    'message': f'Video uploaded successfully! URL: {video_url}'
                }
            else:
                return {
                    'success': False,
                    'error': 'Upload failed - no video ID returned'
                }
                
        except googleapiclient.errors.HttpError as e:
            error_details = e.error_details[0] if e.error_details else {}
            return {
                'success': False,
                'error': f'YouTube API error: {error_details.get("message", str(e))}'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Upload failed: {str(e)}'
            }
    
    def _save_upload_info(self, video_info: Dict[str, Any], video_id: str, video_url: str, title: str):
        """Save upload information to database"""
        upload_data = {
            'video_id': video_id,
            'video_url': video_url,
            'title': title,
            'uploaded_at': datetime.now().isoformat(),
            'original_video': video_info.get('title', ''),
            'topic': video_info.get('topic', '')
        }
        
        # Save to database (you might want to extend your database schema)
        # For now, we'll save to a separate uploads file
        uploads_file = "data/youtube_uploads.json"
        uploads = []
        
        if os.path.exists(uploads_file):
            with open(uploads_file, 'r', encoding='utf-8') as f:
                uploads = json.load(f)
        
        uploads.append(upload_data)
        
        with open(uploads_file, 'w', encoding='utf-8') as f:
            json.dump(uploads, f, indent=2, ensure_ascii=False)
    
    def get_upload_history(self) -> list:
        """Get history of uploaded videos"""
        uploads_file = "data/youtube_uploads.json"
        if os.path.exists(uploads_file):
            with open(uploads_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    
    def check_authentication_status(self) -> Dict[str, Any]:
        """Check if user is authenticated with YouTube"""
        try:
            # Check if credentials file exists
            if not os.path.exists(self.credentials_file):
                return {
                    'authenticated': False,
                    'message': f'Credentials file {self.credentials_file} not found'
                }
            
            # Check if token file exists and is valid
            if os.path.exists(self.token_file):
                try:
                    creds = Credentials.from_authorized_user_file(self.token_file, scopes=self.SCOPES)
                    if creds and creds.valid:
                        return {
                            'authenticated': True,
                            'message': 'Authenticated and ready to upload'
                        }
                    elif creds and creds.expired and creds.refresh_token:
                        # Try to refresh
                        try:
                            creds.refresh(GoogleAuthRequest())
                            # Save refreshed token
                            Path(self.token_file).parent.mkdir(parents=True, exist_ok=True)
                            with open(self.token_file, "w", encoding="utf-8") as token_out:
                                token_out.write(creds.to_json())
                            return {
                                'authenticated': True,
                                'message': 'Authenticated and ready to upload'
                            }
                        except Exception:
                            pass
                except Exception:
                    pass
            
            return {
                'authenticated': False,
                'message': 'Please authenticate to upload videos'
            }
            
        except Exception as e:
            return {
                'authenticated': False,
                'message': f'Authentication check failed: {str(e)}'
            }
    
    def revoke_credentials(self) -> bool:
        """Revoke stored credentials"""
        try:
            # Remove token file
            if os.path.exists(self.token_file):
                os.remove(self.token_file)
            
            return True
        except Exception as e:
            print(f"Failed to revoke credentials: {e}")
            return False
