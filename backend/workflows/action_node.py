import os
import json
from datetime import date, datetime, timezone, timedelta
from groq import Groq
from tools.registry import registry
from services.google_auth import get_credentials

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
FIXED_USER_ID = "lexi_user_main"

INTENT_PROMPT = """You are Lexi's action router. Extract the intent from the user message and return JSON.

GMAIL rules:
- READ emails: action = "read_inbox"
- COUNT unread: action = "unread_count"
- SEARCH specific sender/topic: action = "search"
- CHECK SPAM: action = "search_spam"
- SEND email now: action = "send_email"
- DRAFT/WRITE/COMPOSE email: action = "draft_email"
- "did I get email from X": action = "search", query = "from:X"

CALENDAR rules:
- "what's on my calendar today" / "today's schedule": action = "get_today"
- "what's this week" / "upcoming events": action = "get_week"
- "am I free tomorrow/friday/etc": action = "find_free_slots", date = the day mentioned
- "schedule/create/add a meeting/event": action = "create_event"
- "search calendar for X": action = "search_events"
- "upcoming meetings": action = "list_events"

DRIVE rules:
- "find/search my file/document/resume/notes": action = "search_files"
- "open/read/summarize a file": action = "get_file_content" (need file_id)
- "recent files": action = "list_recent"

For create_event extract:
- title: event name
- start: ISO 8601 datetime (assume IST = UTC+5:30, e.g. "2026-07-15T15:00:00+05:30")
- end: ISO 8601 datetime (default 1 hour after start)
- attendees: list of email addresses if mentioned

For send_email and draft_email extract:
- to: recipient email
- recipient_name: role or name
- context: exact user message
- tone: professional/casual/formal

For search_files extract:
- query: search term (e.g. "resume", "machine learning", "internship report")

Return ONLY valid JSON. No markdown. No explanation.

Examples:

User: "what's on my calendar today"
{"tool": "calendar", "action": "get_today", "params": {}}

User: "am I free tomorrow"
{"tool": "calendar", "action": "find_free_slots", "params": {"date": "tomorrow"}}

User: "am I free on Friday"
{"tool": "calendar", "action": "find_free_slots", "params": {"date": "friday"}}

User: "schedule a meeting called Team Sync on July 15 at 3pm"
{"tool": "calendar", "action": "create_event", "params": {"title": "Team Sync", "start": "2026-07-15T15:00:00+05:30", "end": "2026-07-15T16:00:00+05:30"}}

User: "what meetings do I have this week"
{"tool": "calendar", "action": "get_week", "params": {}}

User: "find my resume in drive"
{"tool": "drive", "action": "search_files", "params": {"query": "resume"}}

User: "search for my machine learning notes"
{"tool": "drive", "action": "search_files", "params": {"query": "machine learning"}}

User: "show my recent files"
{"tool": "drive", "action": "list_recent", "params": {"max_results": 10}}

User: "how many unread emails do I have"
{"tool": "gmail", "action": "unread_count", "params": {}}

User: "summarize my inbox"
{"tool": "gmail", "action": "read_inbox", "params": {"max_results": 10}}

User: "did I get an email from Myntra"
{"tool": "gmail", "action": "search", "params": {"query": "from:myntra.com", "max_results": 5}}

User: "send an email to john@example.com saying I will be late"
{"tool": "gmail", "action": "send_email", "params": {"to": "john@example.com", "recipient_name": "John", "context": "send an email to john@example.com saying I will be late", "tone": "casual"}}

User: "draft a professional email to my internship coordinator at coordinator@company.com saying I need leave tomorrow"
{"tool": "gmail", "action": "draft_email", "params": {"to": "coordinator@company.com", "recipient_name": "internship coordinator", "context": "draft a professional email to my internship coordinator at coordinator@company.com saying I need leave tomorrow", "tone": "professional"}}

User message: """

EMAIL_WRITER_PROMPT = """You are Lexi, writing a ready-to-send email on behalf of Lekshmi Prasad.

SENDER INFORMATION — use these exact values, never use placeholders:
- Sender full name: Lekshmi Prasad
- Sign off: Lekshmi
- Today's date: {today}

RECIPIENT:
- Role: {recipient_name}
- Email: {to}
- Tone: {tone}

USER REQUEST: {context}

ABSOLUTE RULES:
1. NEVER write anything in square brackets.
2. If you don't know the name, use their role: "Dear Internship Coordinator"
3. Sign as exactly "Lekshmi" only
4. Use {today} for dates, never [date]
5. Email must be 100% ready to send

For professional/formal: "Warm regards,\\nLekshmi"
For casual: "- Lekshmi"

Return ONLY this JSON:
{{"subject": "subject here", "body": "complete email body here"}}"""

SYNTHESIS_PROMPT = """You are Lexi, a warm intelligent personal AI assistant.

You just performed a real action for the user using their Google account.
Result from backend:

{result}

STRICT RULES:
- Use EXACT numbers from result — never estimate
- For calendar events — list them clearly with time and title
- For "is free" — say clearly if they are free or busy and list what's there
- For created events — confirm the event name, date and time
- For drive files — list file names and offer to open/summarize
- For draft/send email — confirm naturally
- For email search — summarize what was found
- Never show raw JSON
- No code blocks

Respond naturally and warmly."""


async def action_node(state: dict, db) -> dict:
    user_message = state.get("message", "")

    print(f"\n=== ACTION NODE CALLED ===")
    print(f"Message: {user_message}")

    # step 1 — route intent
    intent_response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[{"role": "user", "content": INTENT_PROMPT + user_message}],
        temperature=0,
        max_tokens=800,
    )

    raw = intent_response.choices[0].message.content.strip()
    print(f"Intent raw: {raw}")

    try:
        clean_raw = raw.replace("```json", "").replace("```", "").strip()
        intent = json.loads(clean_raw)
    except json.JSONDecodeError:
        return {
            **state,
            "response": "I understood you wanted me to do something, but I couldn't parse the details. Could you rephrase that?",
        }

    tool_name = intent.get("tool")
    action = intent.get("action")
    params = intent.get("params", {})

    print(f"Tool: {tool_name}, Action: {action}")

    # step 2 — email writer for drafts and sends
    if action in ("draft_email", "send_email") and "context" in params:
        email_response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{
                "role": "user",
                "content": EMAIL_WRITER_PROMPT.format(
                    today=date.today().strftime("%B %d, %Y"),
                    recipient_name=params.get("recipient_name", "recipient"),
                    to=params.get("to", ""),
                    tone=params.get("tone", "professional"),
                    context=params.get("context", user_message),
                )
            }],
            temperature=0.7,
            max_tokens=600,
        )
        email_raw = email_response.choices[0].message.content.strip()
        print(f"Email writer output: {email_raw}")
        try:
            clean_email = email_raw.replace("```json", "").replace("```", "").strip()
            email_data = json.loads(clean_email)
            params["subject"] = email_data.get("subject", "Hello")
            params["body"] = email_data.get("body", user_message)
        except json.JSONDecodeError:
            params["subject"] = "Message from Lexi"
            params["body"] = email_raw

    params["action"] = action

    # step 3 — get credentials
    creds = await get_credentials(FIXED_USER_ID, db)
    if not creds:
        return {
            **state,
            "response": "You haven't connected your Google account yet. Please click 'Connect Google' in the sidebar first.",
        }

    # step 4 — run the tool
    tool = registry.get_tool(tool_name, creds)
    if not tool:
        return {
            **state,
            "response": f"I don't have a tool for '{tool_name}' yet.",
        }

    result = tool.run(params)
    print(f"Tool result: {result}")

    # step 5 — synthesize response
    synthesis_response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "system",
                "content": SYNTHESIS_PROMPT.format(result=json.dumps(result, indent=2)),
            },
            {"role": "user", "content": user_message},
        ],
        temperature=0.7,
        max_tokens=600,
    )

    natural_response = synthesis_response.choices[0].message.content.strip()

    return {
        **state,
        "response": natural_response,
        "action_taken": True,
        "tool_used": tool_name,
        "action": action,
    }