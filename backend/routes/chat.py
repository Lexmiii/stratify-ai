import traceback
import os
import json
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import List, Optional
from workflows.strategy_flow import build_strategy_graph
from workflows.action_node import action_node
from tools.registry import setup_registry
from services.memory_service import (
    save_session, get_session, save_message_history,
    get_message_history, get_all_chat_meta, toggle_pin, delete_chat
)

router = APIRouter()
setup_registry()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"
    history: Optional[List[ChatMessage]] = []
    mode: Optional[str] = "Default"

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

def classify_intent(message: str, history: list = []) -> str:
    msg = message.lower().strip()

    # follow-up detection for gmail context
    if history:
        recent = " ".join([
            m.content.lower() for m in history[-3:]
            if hasattr(m, 'content')
        ])
        if any(w in recent for w in ["email", "inbox", "mail", "spam"]):
            if any(ind in msg for ind in [
                "not them", "check again", "search again", "what about",
                "any from", "try again", "still nothing", "are you sure",
                "5 days ago", "last week", "yesterday",
            ]):
                return "gmail"

    # gmail
    gmail_patterns = [
        "email", "mail", "inbox", "spam", "draft", "sent", "unread",
        "did i get", "did i receive", "got an email", "received an email",
        "any email", "any mail", "check if", "see if i got",
        "from tryhackme", "from edx", "from myntra", "from google",
        "from amazon", "from linkedin", "from my professor",
        "from my team", "from my boss", "from my friend",
        "from my college", "from mgits", "from handshake",
        "send an email", "send email", "draft an email",
        "write an email", "compose an email", "shoot an email",
        "drop an email", "email to", "mail to",
        "hackable email", "hackathon email", "slot booking email",
        "assessment email", "course email", "internship email",
    ]

    # calendar
    calendar_patterns = [
        "calendar", "schedule", "meeting", "event", "appointment",
        "am i free", "am i available", "book a slot", "create event",
        "add to calendar", "reschedule", "cancel meeting",
        "what's on my", "what is on my", "today's events",
        "this week", "upcoming meetings", "upcoming events",
        "free tomorrow", "free today", "free on friday",
        "free on monday", "free on saturday", "free on sunday",
        "schedule a meeting", "set up a meeting", "create a meeting",
        "add an event", "block time",
    ]

    # drive
    drive_patterns = [
        "drive", "my file", "my document", "my resume", "my notes",
        "find file", "search file", "open file", "my pdf",
        "find my", "search for my", "look for my",
        "internship report", "project report", "ml notes",
        "machine learning notes", "recent files",
    ]

    for pattern in gmail_patterns:
        if pattern in msg:
            return "gmail"

    for pattern in calendar_patterns:
        if pattern in msg:
            return "calendar"

    for pattern in drive_patterns:
        if pattern in msg:
            return "drive"

    return "conversation"

@router.post("/chat")
async def chat(request: ChatRequest, req: Request):
    try:
        db = req.app.state.db

        history_text = ""
        if request.history:
            history_text = "\n".join([
                f"{'User' if msg.role == 'user' else 'Lexi'}: {msg.content}"
                for msg in request.history[-4:]
            ])

        # classify intent globally before any persona
        intent = classify_intent(request.message, request.history or [])

        print(f"\n=== CHAT REQUEST ===")
        print(f"Message: {request.message}")
        print(f"Intent: {intent}")
        print(f"Mode: {request.mode}")

        # tool intent — execute regardless of mode
        if intent in ("gmail", "calendar", "drive"):
            action_state = {
                "message": request.message,
                "history_context": history_text,
                "mode": request.mode or "Default",
                "intent_type": intent,
            }
            result = await action_node(action_state, db)
            direct_response = result.get("response", "I couldn't complete that action.")

            await save_session(request.session_id, request.message, {"recommendation": direct_response})
            await save_message_history(request.session_id, request.message, direct_response)

            return {
                "session_id": request.session_id,
                "goal": request.message,
                "direct_response": direct_response,
                "subproblems": [],
                "roadmap": {"recommendation": direct_response},
                "analysis": "",
                "sources": [],
                "used_search": False,
                "action_taken": result.get("action_taken", False),
                "tool_used": result.get("tool_used", ""),
            }

        # conversation — persona handles it
        graph = build_strategy_graph()
        initial_state = {
            "goal": request.message,
            "history_context": history_text,
            "mode": request.mode or "Default",
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
            "is_action": False,
            "db": None,
        }

        result = graph.invoke(initial_state)
        normalized = normalize_response(result)

        await save_session(
            request.session_id,
            request.message,
            normalized["roadmap"]
        )

        await save_message_history(
            request.session_id,
            request.message,
            normalized["direct_response"]
        )

        return {
            "session_id": request.session_id,
            "goal": request.message,
            **normalized
        }

    except Exception as e:
        traceback.print_exc()
        return {
            "session_id": request.session_id,
            "goal": request.message,
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