import os
import traceback
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse, JSONResponse
from services.google_auth import (
    get_auth_url,
    handle_callback,
    get_connection_status,
    disconnect,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def get_db(request: Request):
    return request.app.state.db


@router.get("/google/login")
async def google_login(session_id: str):
    url = get_auth_url(session_id)
    return {"auth_url": url}


@router.get("/google/callback")
async def google_callback(request: Request, code: str, state: str):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    try:
        db = get_db(request)
        result = await handle_callback(code=code, session_id=state, db=db)
        return RedirectResponse(
            url=f"{frontend_url}/chat?google_connected=true&email={result['email']}"
        )
    except Exception as e:
        traceback.print_exc()
        print(f"CALLBACK ERROR: {str(e)}")
        return RedirectResponse(
            url=f"{frontend_url}/chat?error=auth_failed&reason={str(e)}"
        )


@router.get("/google/status")
async def google_status(request: Request, session_id: str):
    db = get_db(request)
    status = await get_connection_status(session_id, db)
    return JSONResponse(status)


@router.delete("/google/disconnect")
async def google_disconnect(request: Request, session_id: str):
    db = get_db(request)
    await disconnect(session_id, db)
    return {"disconnected": True}