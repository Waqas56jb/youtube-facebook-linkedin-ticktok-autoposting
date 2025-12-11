from fastapi import APIRouter
from backend.app.models import StoryRequest
from backend.app.services.llm import generate_story_with_gemini, generate_chat_response


router = APIRouter(tags=["story"])


@router.post("/story/generate")
async def generate_story(req: StoryRequest):
    story = generate_story_with_gemini(
        transcript=req.text,
        story_format=req.format,
        use_custom_prompt=req.useCustomPrompt,
        custom_prompt=req.customPrompt,
    )
    return {"story": story}


@router.post("/chat")
async def chat(payload: dict):
    message = str(payload.get("message", "")).strip()
    if not message:
        return {"reply": "Please provide a message."}
    hint = str(payload.get("hint", "")).strip() or None
    reply = generate_chat_response(message, hint)
    return {"reply": reply}


