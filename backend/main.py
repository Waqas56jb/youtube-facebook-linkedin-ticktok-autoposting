"""
🎬 Video Caption Generator - FastAPI Backend
Industry-standard FastAPI application with YouTube automation
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import requests
import os
def safe_get_text(resp: requests.Response) -> str:
    try:
        return resp.text
    except Exception:
        return ""

# Import routers
from backend.routers import videos, captions, youtube, utils, video_management, linkedin
from backend.app.routers import transcript as app_transcript, story as app_story, video as app_video
from fastapi import Request
from backend.app.services.llm import generate_chat_response
from backend.app.services.whisper import get_whisper_model

# Initialize FastAPI app
app = FastAPI(
    title="Video Caption Generator API",
    description="Professional video caption generation with YouTube automation",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000", 
        "http://localhost:8000",
        "https://youtube-automation-ui.fly.dev",
        "https://youtube-automation.fly.dev"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(videos.router)  # Already has /api/videos prefix
app.include_router(captions.router)  # Already has /api/captions prefix
app.include_router(youtube.router)  # Already has /api/youtube prefix
app.include_router(utils.router)  # Already has /api prefix
app.include_router(video_management.router)  # Already has /video prefix
app.include_router(app_transcript.router, prefix="/api/transcript")
app.include_router(app_story.router, prefix="/api")
app.include_router(app_video.router)  # exposes /video/* endpoints from app router
app.include_router(linkedin.router)  # /api/linkedin

# Warm-up: initialize Whisper on startup to avoid first-request lag
@app.on_event("startup")
async def _warm_whisper_model():
    try:
        _ = get_whisper_model()
    except Exception:
        # Do not block app startup; health and /transcript/health will report details
        pass

# Simple chat endpoint at /chat for the frontend
@app.post("/chat")
async def chat(payload: dict):
    message = str(payload.get("message", "")).strip()
    if not message:
        return {"reply": "Please provide a message."}
    # In-scope canned answer for service/capabilities queries
    lower = message.lower()
    if any(k in lower for k in [
        "service", "services", "what can you do", "features", "capabilities", "what do you offer",
        "what you offer", "scope", "what are you", "your product", "platform do"
    ]):
        reply = (
            "This platform automates your YouTube content pipeline end‑to‑end so you ship faster with higher quality.\n\n"
            "• Transcripts (media & docs): Upload audio/video or documents (PDF, DOCX, TXT, SRT/VTT, PPTX, CSV). We auto‑transcribe with Whisper or extract clean text.\n"
            "• Story generation: Convert any transcript or pasted script into polished, platform‑ready stories using Gemini.\n"
            "• Title & caption generation: Create 5–6 word professional titles and universal‑format captions (hook, value, CTA, 10–15 hashtags).\n"
            "• Video tooling: Upload and trim clips, detect existing captions, tidy orphaned files, and preview media in the library.\n"
            "• Scheduling & automation: Group clips by date, save/edit captions, schedule posts, and manage a lightweight calendar to save hours each week.\n"
            "• YouTube upload: One‑time OAuth. Then private uploads with correct title, description, and tags—no repeated verification.\n"
            "• Dashboards & insights: KPI cards, platform breakdowns, funnels, retention cohorts, timelines, and workflow recommendations to boost reach.\n"
            "• In‑app assistant: Focused guidance on setup (env keys), workflows, and troubleshooting—kept strictly within this product’s scope.\n\n"
            "Ask me anything like: ‘generate captions for today’s clips’, ‘turn this transcript into a story’, ‘schedule and upload tonight’, or ‘optimize my titles’. I’ll walk you through it step‑by‑step."
        )
        return {"reply": reply}
    user_hint = str(payload.get("hint", "")).strip()
    default_scope_hint = (
        "You are the assistant for a social media automation app."
        " Stay strictly within this product's features: YouTube upload (OAuth), caption/title generation"
        " with Gemini, transcripts (Whisper or document extraction), story generation, scheduling,"
        " analytics dashboards, troubleshooting environment keys (GEMINI_API_KEY/GOOGLE_API_KEY) and API usage."
        " Provide focused, positive, action-oriented answers with enough detail to be useful (2–6 sentences)."
        " If a query is out of scope (e.g., generic unrelated topics),"
        " respond with: 'This assistant is focused on YouTube automation and app features.'"
    )
    hint = (default_scope_hint + ("\n\nExtra context: " + user_hint if user_hint else ""))
    reply = generate_chat_response(message, hint)
    return {"reply": reply}

# Root endpoint - API info
@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "message": "Video Caption Generator API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }

# Health check
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "Video Caption Generator API is running",
        "version": "1.0.0"
    }

# Social Media Posting Endpoints
@app.post("/api/social/linkedin/post")
async def post_to_linkedin(request: Request):
    """Post to LinkedIn using credentials from settings"""
    try:
        body = await request.json()
        access_token = body.get("access_token")
        member_id = body.get("member_id")
        title = body.get("title", "")
        description = body.get("description", "")
        file_path = body.get("file_path", "")
        
        if not access_token:
            raise HTTPException(status_code=400, detail="Missing required field: access_token")
        # Auto-resolve member_id from token if missing
        if not member_id:
            try:
                headers_probe = {
                    "Authorization": f"Bearer {access_token}",
                    "X-Restli-Protocol-Version": "2.0.0",
                }
                probe = requests.get("https://api.linkedin.com/v2/userinfo", headers=headers_probe, timeout=15)
                if probe.status_code == 200:
                    data = probe.json()
                    member_id = data.get("sub")
                # Fallback to /v2/me which returns { id: "..." }
                if not member_id:
                    probe_me = requests.get("https://api.linkedin.com/v2/me", headers=headers_probe, timeout=15)
                    if probe_me.status_code == 200:
                        data_me = probe_me.json()
                        member_id = data_me.get("id")
                if not member_id:
                    raise HTTPException(status_code=422, detail="Unable to resolve LinkedIn member_id from token")
            except requests.RequestException as exc:
                raise HTTPException(status_code=502, detail=f"LinkedIn userinfo request failed: {exc}")
        
        # Validate file exists
        # Optional media: if provided relative path, prefix storage/
        if file_path:
            candidate = file_path
            if not os.path.isabs(candidate) and not candidate.startswith("storage/"):
                candidate = os.path.join("storage", candidate.replace("\\", "/"))
            if not os.path.exists(candidate):
                raise HTTPException(status_code=404, detail="File not found")
            file_path = candidate
        
        # If no media, create a text-only post (try ugcPosts; fallback to posts API)
        if not file_path:
            message_text = (description or title or "").strip()
            if not message_text:
                raise HTTPException(status_code=400, detail="Text content is required for text-only LinkedIn post")

            headers = {
                "Authorization": f"Bearer {access_token}",
                "X-Restli-Protocol-Version": "2.0.0",
            }
            # Attempt legacy UGC post first
            ugc_url = "https://api.linkedin.com/v2/ugcPosts"
            ugc_payload = {
                "author": f"urn:li:person:{member_id}",
                "lifecycleState": "PUBLISHED",
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {"text": message_text},
                        "shareMediaCategory": "NONE"
                    }
                },
                "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}
            }
            ugc_resp = requests.post(ugc_url, headers=headers, json=ugc_payload)
            if ugc_resp.status_code in [200, 201]:
                return {"success": True, "message": "LinkedIn text post published (UGC)", "details": ugc_resp.json()}

            # Fallback to posts API
            posts_url = "https://api.linkedin.com/v2/posts"
            posts_headers = {
                **headers,
                "LinkedIn-Version": "202305",
            }
            posts_payload = {
                "author": f"urn:li:person:{member_id}",
                "commentary": message_text,
                "visibility": "PUBLIC",
                "distribution": {
                    "feedDistribution": "MAIN_FEED",
                    "targetEntities": [],
                    "thirdPartyDistributionChannels": []
                },
                "lifecycleState": "PUBLISHED",
                "isReshareOf": None
            }
            posts_resp = requests.post(posts_url, headers=posts_headers, json=posts_payload)
            if posts_resp.status_code in [200, 201]:
                return {"success": True, "message": "LinkedIn text post published (Posts API)", "details": posts_resp.json()}
            raise HTTPException(status_code=posts_resp.status_code, detail={
                "error": "LinkedIn text post failed",
                "ugc_error": safe_get_text(ugc_resp),
                "posts_error": safe_get_text(posts_resp)
            })

        # Step 1: Register upload (image/video)
        headers = {
            "Authorization": f"Bearer {access_token}",
            "X-Restli-Protocol-Version": "2.0.0"
        }
        
        register_url = "https://api.linkedin.com/v2/assets?action=registerUpload"
        is_video = file_path.lower().endswith((".mp4", ".mov", ".mkv", ".avi", ".webm"))
        recipe = "urn:li:digitalmediaRecipe:feedshare-video" if is_video else "urn:li:digitalmediaRecipe:feedshare-image"
        media_category = "VIDEO" if is_video else "IMAGE"
        register_payload = {
            "registerUploadRequest": {
                "owner": f"urn:li:person:{member_id}",
                "recipes": [recipe],
                "serviceRelationships": [
                    {"identifier": "urn:li:userGeneratedContent", "relationshipType": "OWNER"}
                ],
                "supportedUploadMechanism": ["SYNCHRONOUS_UPLOAD"]
            }
        }
        
        response = requests.post(register_url, headers=headers, json=register_payload)
        if response.status_code not in [200, 201]:
            raise HTTPException(status_code=response.status_code, detail=f"Failed to register upload: {response.text}")
        
        register_data = response.json()
        asset_urn = register_data["value"]["asset"]
        upload_url = register_data["value"]["uploadMechanism"]["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]["uploadUrl"]
        
        # Step 2: Upload file
        with open(file_path, "rb") as f:
            file_data = f.read()
        
        # LinkedIn upload URLs typically do not require Authorization; include only content type
        upload_headers = {"Content-Type": "application/octet-stream"}
        upload_response = requests.put(upload_url, headers=upload_headers, data=file_data)
        if upload_response.status_code not in [200, 201]:
            raise HTTPException(status_code=upload_response.status_code, detail=f"Failed to upload file: {upload_response.text}")
        
        # Step 3: Create post
        post_url = "https://api.linkedin.com/v2/ugcPosts"
        post_payload = {
            "author": f"urn:li:person:{member_id}",
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": description or title or ""},
                    "shareMediaCategory": media_category,
                    "media": [
                        {
                            "status": "READY",
                            "description": {"text": title or ""},
                            "media": asset_urn,
                            "title": {"text": title or ""}
                        }
                    ]
                }
            },
            "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}
        }
        
        post_response = requests.post(post_url, headers=headers, json=post_payload)
        if post_response.status_code in [200, 201]:
            return {
                "success": True,
                "message": "LinkedIn post published successfully!",
                "post_id": post_response.json().get("id"),
                "details": post_response.json()
            }
        else:
            raise HTTPException(status_code=post_response.status_code, detail=f"Failed to publish post: {post_response.text}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LinkedIn posting error: {str(e)}")

@app.post("/api/social/facebook/post")
async def post_to_facebook(request: Request):
    """Post to Facebook using credentials from settings"""
    try:
        body = await request.json()
        access_token = body.get("access_token")
        app_id = body.get("app_id")
        app_secret = body.get("app_secret")
        page_id = body.get("page_id")
        title = body.get("title", "")
        description = body.get("description", "")
        file_path = body.get("file_path", "")
        
        if not all([access_token, app_id, page_id]):
            raise HTTPException(status_code=400, detail="Missing required fields: access_token, app_id, page_id")
        
        # Validate file exists
        # If text-only, post a feed message
        if not file_path:
            message = (description or title or "").strip()
            if not message:
                raise HTTPException(status_code=400, detail="Text content required for text-only post")
            feed_url = f'https://graph.facebook.com/v23.0/{page_id}/feed'
            payload = {'message': message, 'access_token': access_token}
            response = requests.post(feed_url, data=payload, timeout=60)
            data = response.json()
            if 'id' in data:
                return {"success": True, "message": "Facebook text post published successfully!", "post_id": data['id'], "details": data}
            raise HTTPException(status_code=response.status_code, detail=f"Failed to post text: {data}")

        # Media provided: normalize relative path
        candidate = file_path
        if not os.path.isabs(candidate) and not candidate.startswith("storage/"):
            candidate = os.path.join("storage", candidate.replace("\\", "/"))
        if not os.path.exists(candidate):
            raise HTTPException(status_code=404, detail="File not found")
        file_path = candidate
        
        # Determine if it's a video or image
        is_video = file_path.lower().endswith(('.mp4', '.mov', '.avi', '.mkv'))
        
        if is_video:
            # Post video
            video_post_url = f'https://graph.facebook.com/v23.0/{page_id}/videos'
            
            with open(file_path, "rb") as video_file:
                video_payload = {
                    'description': description or title,
                    'access_token': access_token
                }
                files = {'source': video_file}
                
                response = requests.post(video_post_url, data=video_payload, files=files, timeout=300)
                response_data = response.json()
                
                if 'id' in response_data:
                    return {
                        "success": True,
                        "message": "Facebook video posted successfully!",
                        "post_id": response_data['id'],
                        "details": response_data
                    }
                else:
                    raise HTTPException(status_code=response.status_code, detail=f"Failed to post video: {response_data}")
        else:
            # Post image
            photo_post_url = f'https://graph.facebook.com/v23.0/{page_id}/photos'
            
            with open(file_path, "rb") as photo_file:
                photo_payload = {
                    'message': description or title,
                    'access_token': access_token
                }
                files = {'source': photo_file}
                
                response = requests.post(photo_post_url, data=photo_payload, files=files)
                response_data = response.json()
                
                if 'id' in response_data:
                    return {
                        "success": True,
                        "message": "Facebook photo posted successfully!",
                        "post_id": response_data['id'],
                        "details": response_data
                    }
                else:
                    raise HTTPException(status_code=response.status_code, detail=f"Failed to post photo: {response_data}")
                    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Facebook posting error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )