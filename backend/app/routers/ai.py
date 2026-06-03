import httpx
from fastapi import APIRouter, Depends, HTTPException

from ..config import settings
from ..deps import current_user
from ..models import User
from ..schemas import AiRequest

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/assist")
def assist(payload: AiRequest, _: User = Depends(current_user)) -> dict[str, str]:
    if not settings.llm_api_base or not settings.llm_api_key or not settings.llm_model:
        return {
            "status": "disabled",
            "message": "Set LLM_API_BASE, LLM_API_KEY, and LLM_MODEL in backend/.env to enable AI helpers.",
        }
    try:
        response = httpx.post(
            settings.llm_api_base.rstrip("/") + "/chat/completions",
            headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            json={
                "model": settings.llm_model,
                "messages": [
                    {"role": "system", "content": "You help with gym and nutrition tracking. Be concise and practical."},
                    {"role": "user", "content": f"Task: {payload.task}\nContext: {payload.context}"},
                ],
            },
            timeout=20,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return {"status": "ok", "message": content}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI provider failed: {exc}") from exc
