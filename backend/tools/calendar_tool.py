from tools.base import BaseTool
from googleapiclient.discovery import build
from datetime import datetime, timezone, timedelta


class CalendarTool(BaseTool):
    name = "calendar"
    description = "Read and manage Google Calendar events"

    def run(self, params: dict) -> dict:
        action = params.get("action")

        if action == "list_events":
            return self._list_events(params.get("max_results", 10))
        elif action == "get_today":
            return self._get_today()
        elif action == "get_week":
            return self._get_week()
        elif action == "find_free_slots":
            return self._find_free_slots(params.get("date", "tomorrow"))
        elif action == "create_event":
            return self._create_event(
                params.get("title", "New Event"),
                params.get("start"),
                params.get("end"),
                params.get("description", ""),
                params.get("attendees", []),
            )
        elif action == "search_events":
            return self._search_events(params.get("query", ""))
        else:
            return {"success": False, "data": None, "error": f"Unknown action: {action}"}

    def _get_service(self):
        return build("calendar", "v3", credentials=self.creds)

    def _format_events(self, items: list) -> list:
        formatted = []
        for e in items:
            start = e.get("start", {})
            end = e.get("end", {})
            formatted.append({
                "id": e.get("id"),
                "title": e.get("summary", "Untitled"),
                "start": start.get("dateTime", start.get("date", "")),
                "end": end.get("dateTime", end.get("date", "")),
                "location": e.get("location", ""),
                "description": e.get("description", ""),
                "attendees": [a.get("email") for a in e.get("attendees", [])],
            })
        return formatted

    def _list_events(self, max_results=10) -> dict:
        try:
            service = self._get_service()
            now = datetime.now(timezone.utc).isoformat()
            result = service.events().list(
                calendarId="primary",
                timeMin=now,
                maxResults=max_results,
                singleEvents=True,
                orderBy="startTime",
            ).execute()
            events = self._format_events(result.get("items", []))
            return {"success": True, "data": {"events": events, "count": len(events)}, "error": None}
        except Exception as e:
            return {"success": False, "data": None, "error": str(e)}

    def _get_today(self) -> dict:
        try:
            service = self._get_service()
            now = datetime.now(timezone.utc)
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=1)
            result = service.events().list(
                calendarId="primary",
                timeMin=start.isoformat(),
                timeMax=end.isoformat(),
                singleEvents=True,
                orderBy="startTime",
            ).execute()
            events = self._format_events(result.get("items", []))
            return {
                "success": True,
                "data": {
                    "date": now.strftime("%A, %B %d %Y"),
                    "events": events,
                    "count": len(events),
                    "has_events": len(events) > 0,
                },
                "error": None,
            }
        except Exception as e:
            return {"success": False, "data": None, "error": str(e)}

    def _get_week(self) -> dict:
        try:
            service = self._get_service()
            now = datetime.now(timezone.utc)
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=7)
            result = service.events().list(
                calendarId="primary",
                timeMin=start.isoformat(),
                timeMax=end.isoformat(),
                singleEvents=True,
                orderBy="startTime",
            ).execute()
            events = self._format_events(result.get("items", []))
            return {
                "success": True,
                "data": {
                    "period": "next 7 days",
                    "events": events,
                    "count": len(events),
                },
                "error": None,
            }
        except Exception as e:
            return {"success": False, "data": None, "error": str(e)}

    def _find_free_slots(self, date_str="tomorrow") -> dict:
        try:
            service = self._get_service()
            now = datetime.now(timezone.utc)

            if date_str.lower() == "tomorrow":
                target = now + timedelta(days=1)
            elif date_str.lower() == "today":
                target = now
            elif date_str.lower() == "monday":
                days_ahead = (0 - now.weekday()) % 7 or 7
                target = now + timedelta(days=days_ahead)
            elif date_str.lower() == "friday":
                days_ahead = (4 - now.weekday()) % 7 or 7
                target = now + timedelta(days=days_ahead)
            else:
                try:
                    target = datetime.fromisoformat(date_str).replace(tzinfo=timezone.utc)
                except:
                    target = now + timedelta(days=1)

            start = target.replace(hour=9, minute=0, second=0, microsecond=0)
            end = target.replace(hour=18, minute=0, second=0, microsecond=0)

            result = service.events().list(
                calendarId="primary",
                timeMin=start.isoformat(),
                timeMax=end.isoformat(),
                singleEvents=True,
                orderBy="startTime",
            ).execute()

            events = self._format_events(result.get("items", []))

            return {
                "success": True,
                "data": {
                    "date": target.strftime("%A, %B %d %Y"),
                    "events": events,
                    "busy_count": len(events),
                    "is_completely_free": len(events) == 0,
                },
                "error": None,
            }
        except Exception as e:
            return {"success": False, "data": None, "error": str(e)}

    def _create_event(self, title, start, end, description="", attendees=[]) -> dict:
        try:
            service = self._get_service()
            event = {
                "summary": title,
                "description": description,
                "start": {"dateTime": start, "timeZone": "Asia/Kolkata"},
                "end": {"dateTime": end, "timeZone": "Asia/Kolkata"},
            }
            if attendees:
                event["attendees"] = [{"email": a} for a in attendees]

            result = service.events().insert(
                calendarId="primary",
                body=event,
            ).execute()

            return {
                "success": True,
                "data": {
                    "event_id": result.get("id"),
                    "title": result.get("summary"),
                    "start": result.get("start", {}).get("dateTime"),
                    "end": result.get("end", {}).get("dateTime"),
                    "link": result.get("htmlLink"),
                },
                "error": None,
            }
        except Exception as e:
            return {"success": False, "data": None, "error": str(e)}

    def _search_events(self, query: str) -> dict:
        try:
            service = self._get_service()
            now = datetime.now(timezone.utc).isoformat()
            result = service.events().list(
                calendarId="primary",
                timeMin=now,
                maxResults=10,
                singleEvents=True,
                orderBy="startTime",
                q=query,
            ).execute()
            events = self._format_events(result.get("items", []))
            return {
                "success": True,
                "data": {"events": events, "count": len(events), "query": query},
                "error": None,
            }
        except Exception as e:
            return {"success": False, "data": None, "error": str(e)}