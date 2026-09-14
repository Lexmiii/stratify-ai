from fastapi import APIRouter
from fastapi.responses import Response
from pydantic import BaseModel
from services.tts_service import text_to_speech

router = APIRouter()

class TTSRequest(BaseModel):
    text: str

@router.post("/speak")
async def speak(request: TTSRequest):
    audio_bytes = await text_to_speech(request.text)
    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline"}
    )