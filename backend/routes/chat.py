from fastapi import APIRouter
from pydantic import BaseModel
from workflows.strategy_flow import build_strategy_graph
from services.memory_service import save_session, get_session

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

@router.post("/chat")
async def chat(request: ChatRequest):
    try:
        graph = build_strategy_graph()
        initial_state = {
            "goal": request.message,
            "subproblems": [],
            "analysis": "",
            "roadmap": {},
            "error": ""
        }
        result = graph.invoke(initial_state)

        await save_session(
            request.session_id,
            request.message,
            result["roadmap"]
        )

        return {
            "session_id": request.session_id,
            "goal": request.message,
            "subproblems": result["subproblems"],
            "analysis": result["analysis"],
            "roadmap": result["roadmap"]
        }

    except Exception as e:
        return {
            "session_id": request.session_id,
            "goal": request.message,
            "error": str(e),
            "subproblems": [],
            "analysis": "",
            "roadmap": {}
        }

@router.get("/session/{session_id}")
async def get_history(session_id: str):
    return await get_session(session_id)