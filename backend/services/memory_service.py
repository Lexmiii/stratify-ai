from db.mongo import sessions_collection
from datetime import datetime

async def save_session(session_id: str, goal: str, roadmap: dict):
    await sessions_collection.update_one(
        {"session_id": session_id},
        {"$push": {
            "history": {
                "goal": goal,
                "roadmap": roadmap,
                "timestamp": datetime.utcnow().isoformat()
            }
        }},
        upsert=True
    )

async def get_session(session_id: str):
    session = await sessions_collection.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    return session or {"session_id": session_id, "history": []}