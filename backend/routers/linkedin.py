"""
LinkedIn helper endpoints
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests

router = APIRouter(prefix="/api/linkedin", tags=["linkedin"])


class TokenInput(BaseModel):
    access_token: str


@router.post("/member-id")
def get_member_id(payload: TokenInput):
    """Resolve LinkedIn member id using the provided OAuth access token."""
    access_token = payload.access_token.strip()
    if not access_token:
        raise HTTPException(status_code=400, detail="access_token is required")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Restli-Protocol-Version": "2.0.0",
    }

    try:
        # Try OpenID Connect userinfo first
        resp = requests.get("https://api.linkedin.com/v2/userinfo", headers=headers, timeout=15)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"LinkedIn request failed: {exc}")

    member_id = None
    if resp.status_code == 200:
        try:
            data = resp.json()
            member_id = data.get("sub")
        except Exception:
            member_id = None

    # Fallback to /v2/me which returns { id: "..." }
    if not member_id:
        try:
            resp_me = requests.get("https://api.linkedin.com/v2/me", headers=headers, timeout=15)
            if resp_me.status_code == 200:
                data_me = resp_me.json()
                member_id = data_me.get("id")
        except requests.RequestException:
            pass

    if not member_id:
        detail = {}
        try:
            detail = resp.json()
        except Exception:
            detail = {"text": resp.text}
        raise HTTPException(status_code=422, detail={"error": "Unable to resolve member id", "debug": detail})

    return {"member_id": member_id, "urn": f"urn:li:person:{member_id}"}


