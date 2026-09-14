import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from routes.chat import router as chat_router
from routes.auth import router as auth_router
from routes.tts import router as tts_router

app = FastAPI(title="Stratify AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
    app.state.db = client["lexi"]

app.include_router(chat_router, prefix="/api")
app.include_router(auth_router)
app.include_router(tts_router, prefix="/api")

@app.get("/")
def root():
    return {"status": "Stratify AI is running"}