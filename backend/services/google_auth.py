import os
import json
from datetime import datetime, timezone
from cryptography.fernet import Fernet
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/drive.readonly",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

CLIENT_CONFIG = {
    "web": {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "redirect_uris": [os.getenv("GOOGLE_REDIRECT_URI")],
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
    }
}


def _get_fernet():
    key = os.getenv("TOKEN_ENCRYPT_KEY")
    if not key:
        raise ValueError("TOKEN_ENCRYPT_KEY not set in environment")
    return Fernet(key.encode())


def _encrypt(data: dict) -> str:
    return _get_fernet().encrypt(json.dumps(data).encode()).decode()


def _decrypt(token_str: str) -> dict:
    return json.loads(_get_fernet().decrypt(token_str.encode()).decode())


def get_auth_url(session_id: str) -> str:
    flow = Flow.from_client_config(CLIENT_CONFIG, scopes=SCOPES)
    flow.redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    # disable PKCE to avoid code verifier issues
    flow.oauth2session.code_challenge_method = None
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=session_id,
    )
    return auth_url


async def handle_callback(code: str, session_id: str, db) -> dict:
    flow = Flow.from_client_config(CLIENT_CONFIG, scopes=SCOPES, state=session_id)
    flow.redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    # disable PKCE code verifier
    flow.fetch_token(code=code, code_verifier=None)

    creds = flow.credentials
    token_data = {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": list(creds.scopes) if creds.scopes else SCOPES,
        "expiry": creds.expiry.isoformat() if creds.expiry else None,
    }

    encrypted = _encrypt(token_data)

    service = build("oauth2", "v2", credentials=creds)
    user_info = service.userinfo().get().execute()
    user_email = user_info.get("email", "unknown")

    await db["google_tokens"].update_one(
        {"session_id": session_id},
        {
            "$set": {
                "session_id": session_id,
                "user_email": user_email,
                "encrypted_token": encrypted,
                "connected_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
    )

    return {"email": user_email, "connected": True}


async def get_credentials(session_id: str, db) -> Credentials | None:
    record = await db["google_tokens"].find_one({"session_id": session_id})
    if not record:
        return None

    token_data = _decrypt(record["encrypted_token"])

    creds = Credentials(
        token=token_data["token"],
        refresh_token=token_data["refresh_token"],
        token_uri=token_data["token_uri"],
        client_id=token_data["client_id"],
        client_secret=token_data["client_secret"],
        scopes=token_data["scopes"],
    )

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token_data["token"] = creds.token
        token_data["expiry"] = creds.expiry.isoformat() if creds.expiry else None
        await db["google_tokens"].update_one(
            {"session_id": session_id},
            {"$set": {"encrypted_token": _encrypt(token_data)}}
        )

    return creds


async def get_connection_status(session_id: str, db) -> dict:
    record = await db["google_tokens"].find_one({"session_id": session_id})
    if not record:
        return {"connected": False, "email": None}
    return {"connected": True, "email": record.get("user_email")}


async def disconnect(session_id: str, db):
    await db["google_tokens"].delete_one({"session_id": session_id})