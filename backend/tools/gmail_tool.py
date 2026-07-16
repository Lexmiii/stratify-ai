from tools.base import BaseTool
from googleapiclient.discovery import build
import base64
import email as email_lib


class GmailTool(BaseTool):
    name = "gmail"
    description = "Read, search, draft and send emails via Gmail"

    def run(self, params: dict) -> dict:
        action = params.get("action")

        if action == "read_inbox":
            return self._read_inbox(params.get("max_results", 20))
        elif action == "search":
            return self._search(params.get("query", ""), params.get("max_results", 5))
        elif action == "search_spam":
            return self._count_and_list_folder("SPAM", params.get("max_results", 10))
        elif action == "get_email":
            return self._get_email(params.get("email_id"))
        elif action == "send_email":
            return self._send_email(
                params.get("to"),
                params.get("subject"),
                params.get("body"),
            )
        elif action == "draft_email":
            return self._draft_email(
                params.get("to"),
                params.get("subject"),
                params.get("body"),
            )
        elif action == "unread_count":
            return self._unread_count()
        else:
            return {"success": False, "data": None, "error": f"Unknown action: {action}"}

    def _get_service(self):
        return build("gmail", "v1", credentials=self.creds)

    def _read_inbox(self, max_results: int = 20) -> dict:
        try:
            service = self._get_service()

            # get exact inbox count from label
            label_info = service.users().labels().get(
                userId="me", id="INBOX"
            ).execute()
            total = label_info.get("messagesTotal", 0)
            unread = label_info.get("messagesUnread", 0)

            results = service.users().messages().list(
                userId="me",
                maxResults=max_results,
                labelIds=["INBOX"],
            ).execute()

            messages = results.get("messages", [])
            emails = []

            for msg in messages:
                detail = service.users().messages().get(
                    userId="me",
                    id=msg["id"],
                    format="metadata",
                    metadataHeaders=["From", "Subject", "Date"],
                ).execute()

                headers = {
                    h["name"]: h["value"]
                    for h in detail.get("payload", {}).get("headers", [])
                }
                emails.append({
                    "id": msg["id"],
                    "from": headers.get("From", "Unknown"),
                    "subject": headers.get("Subject", "No subject"),
                    "date": headers.get("Date", ""),
                    "snippet": detail.get("snippet", ""),
                    "unread": "UNREAD" in detail.get("labelIds", []),
                })

            return {
                "success": True,
                "data": {
                    "folder": "inbox",
                    "totalMessages": total,
                    "unreadMessages": unread,
                    "messages": emails,
                },
                "error": None
            }

        except Exception as e:
            return {"success": False, "data": None, "error": str(e)}

    def _unread_count(self) -> dict:
        try:
            service = self._get_service()
            result = service.users().labels().get(
                userId="me",
                id="INBOX"
            ).execute()
            unread = result.get("messagesUnread", 0)
            total = result.get("messagesTotal", 0)
            return {
                "success": True,
                "data": {
                    "folder": "inbox",
                    "unread_count": unread,
                    "total_count": total,
                },
                "error": None
            }
        except Exception as e:
            return {"success": False, "data": None, "error": str(e)}

    def _count_and_list_folder(self, label: str, max_results: int = 10) -> dict:
        try:
            service = self._get_service()

            # get exact count from label info
            label_info = service.users().labels().get(
                userId="me", id=label
            ).execute()
            total = label_info.get("messagesTotal", 0)
            unread = label_info.get("messagesUnread", 0)

            results = service.users().messages().list(
                userId="me",
                labelIds=[label],
                maxResults=max_results,
            ).execute()

            messages = results.get("messages", [])
            emails = []

            for msg in messages:
                detail = service.users().messages().get(
                    userId="me",
                    id=msg["id"],
                    format="metadata",
                    metadataHeaders=["From", "Subject", "Date"],
                ).execute()

                headers = {
                    h["name"]: h["value"]
                    for h in detail.get("payload", {}).get("headers", [])
                }
                emails.append({
                    "id": msg["id"],
                    "from": headers.get("From", "Unknown"),
                    "subject": headers.get("Subject", "No subject"),
                    "date": headers.get("Date", ""),
                    "snippet": detail.get("snippet", ""),
                })

            return {
                "success": True,
                "data": {
                    "folder": label.lower(),
                    "totalMessages": total,
                    "unreadMessages": unread,
                    "messages": emails,
                },
                "error": None
            }

        except Exception as e:
            return {"success": False, "data": None, "error": str(e)}

    def _search(self, query: str, max_results: int = 5) -> dict:
        try:
            service = self._get_service()
            results = service.users().messages().list(
                userId="me",
                q=query,
                maxResults=max_results,
            ).execute()

            messages = results.get("messages", [])
            total = results.get("resultSizeEstimate", len(messages))
            emails = []

            for msg in messages:
                detail = service.users().messages().get(
                    userId="me",
                    id=msg["id"],
                    format="metadata",
                    metadataHeaders=["From", "Subject", "Date"],
                ).execute()

                headers = {
                    h["name"]: h["value"]
                    for h in detail.get("payload", {}).get("headers", [])
                }
                emails.append({
                    "id": msg["id"],
                    "from": headers.get("From", "Unknown"),
                    "subject": headers.get("Subject", "No subject"),
                    "date": headers.get("Date", ""),
                    "snippet": detail.get("snippet", ""),
                })

            return {
                "success": True,
                "data": {
                    "query": query,
                    "totalMessages": total,
                    "messages": emails,
                },
                "error": None
            }

        except Exception as e:
            return {"success": False, "data": None, "error": str(e)}

    def _get_email(self, email_id: str) -> dict:
        try:
            service = self._get_service()
            detail = service.users().messages().get(
                userId="me",
                id=email_id,
                format="full",
            ).execute()

            headers = {
                h["name"]: h["value"]
                for h in detail.get("payload", {}).get("headers", [])
            }

            body = ""
            payload = detail.get("payload", {})

            if "parts" in payload:
                for part in payload["parts"]:
                    if part.get("mimeType") == "text/plain":
                        data = part.get("body", {}).get("data", "")
                        if data:
                            body = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
                            break
            else:
                data = payload.get("body", {}).get("data", "")
                if data:
                    body = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")

            return {
                "success": True,
                "data": {
                    "id": email_id,
                    "from": headers.get("From", "Unknown"),
                    "to": headers.get("To", ""),
                    "subject": headers.get("Subject", "No subject"),
                    "date": headers.get("Date", ""),
                    "body": body[:3000],
                },
                "error": None,
            }

        except Exception as e:
            return {"success": False, "data": None, "error": str(e)}

    def _send_email(self, to: str, subject: str, body: str) -> dict:
        try:
            service = self._get_service()
            message = email_lib.message.EmailMessage()
            message["To"] = to
            message["Subject"] = subject
            message.set_content(body)

            encoded = base64.urlsafe_b64encode(message.as_bytes()).decode()
            result = service.users().messages().send(
                userId="me",
                body={"raw": encoded},
            ).execute()

            return {"success": True, "data": {"message_id": result["id"]}, "error": None}

        except Exception as e:
            return {"success": False, "data": None, "error": str(e)}

    def _draft_email(self, to: str, subject: str, body: str) -> dict:
        try:
            service = self._get_service()
            message = email_lib.message.EmailMessage()
            message["To"] = to
            message["Subject"] = subject
            message.set_content(body)

            encoded = base64.urlsafe_b64encode(message.as_bytes()).decode()
            result = service.users().drafts().create(
                userId="me",
                body={"message": {"raw": encoded}},
            ).execute()

            return {"success": True, "data": {"draft_id": result["id"]}, "error": None}

        except Exception as e:
            return {"success": False, "data": None, "error": str(e)}