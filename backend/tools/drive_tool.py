from tools.base import BaseTool
from googleapiclient.discovery import build
import base64
import io


class DriveTool(BaseTool):
    name = "drive"
    description = "Search and read files in Google Drive"

    def run(self, params: dict) -> dict:
        action = params.get("action")

        if action == "search_files":
            return self._search_files(
                params.get("query", ""),
                params.get("max_results", 10),
            )
        elif action == "get_file_content":
            return self._get_file_content(params.get("file_id"))
        elif action == "list_recent":
            return self._list_recent(params.get("max_results", 10))
        else:
            return {"success": False, "data": None, "error": f"Unknown action: {action}"}

    def _get_service(self):
        return build("drive", "v3", credentials=self.creds)

    def _search_files(self, query: str, max_results: int = 10) -> dict:
        try:
            service = self._get_service()

            # build search query
            search_query = f"name contains '{query}' and trashed = false"
            if not query:
                search_query = "trashed = false"

            result = service.files().list(
                q=search_query,
                pageSize=max_results,
                fields="files(id, name, mimeType, modifiedTime, size, webViewLink)",
                orderBy="modifiedTime desc",
            ).execute()

            files = result.get("files", [])
            formatted = []
            for f in files:
                formatted.append({
                    "id": f.get("id"),
                    "name": f.get("name"),
                    "type": f.get("mimeType", "").split(".")[-1],
                    "modified": f.get("modifiedTime", ""),
                    "link": f.get("webViewLink", ""),
                    "size": f.get("size", ""),
                })

            return {
                "success": True,
                "data": {
                    "files": formatted,
                    "count": len(formatted),
                    "query": query,
                },
                "error": None,
            }
        except Exception as e:
            return {"success": False, "data": None, "error": str(e)}

    def _list_recent(self, max_results: int = 10) -> dict:
        try:
            service = self._get_service()
            result = service.files().list(
                pageSize=max_results,
                fields="files(id, name, mimeType, modifiedTime, webViewLink)",
                orderBy="modifiedTime desc",
                q="trashed = false",
            ).execute()

            files = result.get("files", [])
            formatted = []
            for f in files:
                formatted.append({
                    "id": f.get("id"),
                    "name": f.get("name"),
                    "type": f.get("mimeType", ""),
                    "modified": f.get("modifiedTime", ""),
                    "link": f.get("webViewLink", ""),
                })

            return {
                "success": True,
                "data": {"files": formatted, "count": len(formatted)},
                "error": None,
            }
        except Exception as e:
            return {"success": False, "data": None, "error": str(e)}

    def _get_file_content(self, file_id: str) -> dict:
        try:
            service = self._get_service()

            # get file metadata first
            file_meta = service.files().get(
                fileId=file_id,
                fields="id, name, mimeType, webViewLink",
            ).execute()

            mime_type = file_meta.get("mimeType", "")
            file_name = file_meta.get("name", "")

            # for Google Docs export as plain text
            if "google-apps.document" in mime_type:
                content = service.files().export(
                    fileId=file_id,
                    mimeType="text/plain",
                ).execute()
                text = content.decode("utf-8", errors="ignore")[:5000]
                return {
                    "success": True,
                    "data": {
                        "id": file_id,
                        "name": file_name,
                        "content": text,
                        "link": file_meta.get("webViewLink"),
                    },
                    "error": None,
                }

            # for Google Sheets export as CSV
            elif "google-apps.spreadsheet" in mime_type:
                content = service.files().export(
                    fileId=file_id,
                    mimeType="text/csv",
                ).execute()
                text = content.decode("utf-8", errors="ignore")[:3000]
                return {
                    "success": True,
                    "data": {
                        "id": file_id,
                        "name": file_name,
                        "content": text,
                        "link": file_meta.get("webViewLink"),
                    },
                    "error": None,
                }

            # for other files just return metadata and link
            else:
                return {
                    "success": True,
                    "data": {
                        "id": file_id,
                        "name": file_name,
                        "type": mime_type,
                        "link": file_meta.get("webViewLink"),
                        "content": f"This is a {mime_type} file. Open it directly: {file_meta.get('webViewLink')}",
                    },
                    "error": None,
                }

        except Exception as e:
            return {"success": False, "data": None, "error": str(e)}