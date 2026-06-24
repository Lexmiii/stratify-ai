from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import List, Optional
from workflows.strategy_flow import build_strategy_graph
from main import limiter
from services.memory_service import (
    save_session, get_session, save_message_history,
    get_message_history, get_all_chat_meta, toggle_pin, delete_chat
)

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"
    history: Optional[List[ChatMessage]] = []
    mode: Optional[str] = "Planner"

def normalize_response(result: dict) -> dict:
    direct_response = (
        result.get("direct_response") or
        result.get("roadmap", {}).get("recommendation") or
        result.get("analysis") or
        ""
    ).strip()

    if not direct_response:
        direct_response = "I had trouble generating a response. Please try again."

    return {
        "direct_response": direct_response,
        "subproblems": result.get("subproblems") or [],
        "roadmap": result.get("roadmap") or {},
        "analysis": result.get("analysis") or "",
        "sources": result.get("sources") or [],
        "used_search": result.get("used_search") or False,
    }

@router.post("/chat")
@limiter.limit("20/minute")
async def chat(request: Request, chat_request: ChatRequest):
    try:
        history_text = ""
        if chat_request.history:
            history_text = "\n".join([
                f"{'User' if msg.role == 'user' else 'Lexi'}: {msg.content}"
                for msg in chat_request.history[-4:]
            ])

        graph = build_strategy_graph()
        initial_state = {
            "goal": chat_request.message,
            "history_context": history_text,
            "mode": chat_request.mode or "Planner",
            "message_type": "",
            "subproblems": [],
            "timeframe": "",
            "analysis": "",
            "roadmap": {},
            "direct_response": "",
            "error": "",
            "research_notes": "",
            "sources": [],
            "used_search": False,
            "verification_required": False,
            "verified": True,
            "show_sources": False,
        }

        result = graph.invoke(initial_state)
        normalized = normalize_response(result)

        await save_session(
            chat_request.session_id,
            chat_request.message,
            normalized["roadmap"]
        )

        await save_message_history(
            chat_request.session_id,
            chat_request.message,
            normalized["direct_response"]
        )

        return {
            "session_id": chat_request.session_id,
            "goal": chat_request.message,
            **normalized
        }

    except Exception as e:
        return {
            "session_id": chat_request.session_id,
            "goal": chat_request.message,
            "direct_response": "Something went wrong. Please try again!",
            "subproblems": [],
            "roadmap": {},
            "analysis": "",
            "sources": [],
            "used_search": False,
            "error": str(e),
        }

@router.get("/session/{session_id}")
async def get_history(session_id: str):
    return await get_session(session_id)

@router.get("/messages/{session_id}")
async def get_messages(session_id: str):
    return await get_message_history(session_id)

@router.get("/chats")
async def list_chats():
    return await get_all_chat_meta()

@router.post("/chats/{session_id}/pin")
async def pin_chat(session_id: str):
    return await toggle_pin(session_id)

@router.delete("/chats/{session_id}")
async def remove_chat(session_id: str):
    return await delete_chat(session_id)