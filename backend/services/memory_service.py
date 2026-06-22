from db.mongo import sessions_collection
from datetime import datetime

async def save_session(session_id: str, goal: str, roadmap: dict):
    await sessions_collection.update_one(
        {"session_id": session_id},
        {
            "$push": {
                "history": {
                    "goal": goal,
                    "roadmap": roadmap,
                    "timestamp": datetime.utcnow().isoformat()
                }
            },
            "$setOnInsert": {
                "created_at": datetime.utcnow().isoformat(),
                "title": goal[:50],
                "pinned": False
            }
        },
        upsert=True
    )

async def get_session(session_id: str):
    session = await sessions_collection.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    return session or {"session_id": session_id, "history": []}

async def save_message_history(session_id: str, user_message: str, lexi_response: str):
    await sessions_collection.update_one(
        {"session_id": session_id},
        {
            "$push": {
                "messages": {
                    "user": user_message,
                    "lexi": lexi_response,
                    "timestamp": datetime.utcnow().isoformat()
                }
            },
            "$setOnInsert": {
                "created_at": datetime.utcnow().isoformat(),
                "title": user_message[:50],
                "pinned": False
            }
        },
        upsert=True
    )

async def get_message_history(session_id: str):
    session = await sessions_collection.find_one(
        {"session_id": session_id},
        {"_id": 0, "messages": 1}
    )
    return session or {"messages": []}

async def get_all_chat_meta():
    cursor = sessions_collection.find(
        {},
        {"_id": 0, "session_id": 1, "title": 1, "pinned": 1, "created_at": 1}
    )
    sessions = await cursor.to_list(length=50)

    # Sort: pinned first, then by created_at descending
    sessions.sort(
        key=lambda s: (not s.get("pinned", False), s.get("created_at", "")),
        reverse=False
    )
    sessions.sort(key=lambda s: s.get("pinned", False), reverse=True)

    return sessions

async def toggle_pin(session_id: str):
    session = await sessions_collection.find_one(
        {"session_id": session_id},
        {"pinned": 1}
    )
    current_pinned = session.get("pinned", False) if session else False

    await sessions_collection.update_one(
        {"session_id": session_id},
        {"$set": {"pinned": not current_pinned}}
    )
    return {"session_id": session_id, "pinned": not current_pinned}

async def delete_chat(session_id: str):
    await sessions_collection.delete_one({"session_id": session_id})
    return {"session_id": session_id, "deleted": True}