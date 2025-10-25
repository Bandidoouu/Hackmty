from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..config import settings

router = APIRouter(tags=["ai"])

class CoachIn(BaseModel):
    message: str

@router.post("/ai/coach")
async def ai_coach(data: CoachIn):
    # Si no hay API KEY, responde básico para demo
    if not settings.GEMINI_API_KEY:
        return {"reply": "Listo. Para recomendaciones reales activa tu GEMINI_API_KEY en backend/.env"}
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL or "gemini-2.5-pro")
        resp = model.generate_content(data.message)
        text = (resp.text or "").strip() if hasattr(resp, "text") else str(resp)
        return {"reply": text or "Sin respuesta del modelo."}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini error: {e}")
