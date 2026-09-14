import os
import httpx

ELEVENLABS_API_KEY = os.getenv("sk_7018ff0f0041c248f5b2db73c4a593d584fa26e8f2a6a4c7")
ELEVENLABS_VOICE_ID = os.getenv("56bWURjYFHyYyVf490Dp")

async def text_to_speech(text: str) -> bytes:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
    
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    
    payload = {
        "text": text,
        "model_id": "eleven_turbo_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.3,
            "use_speaker_boost": True,
        }
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(url, json=payload, headers=headers)
        if not response.is_success:
            raise Exception(f"ElevenLabs error: {response.text}")
        return response.content