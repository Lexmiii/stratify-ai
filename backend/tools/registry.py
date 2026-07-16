from tools.base import BaseTool
from google.oauth2.credentials import Credentials


class ToolRegistry:
    def __init__(self):
        self._tools: dict[str, type[BaseTool]] = {}

    def register(self, tool_class: type[BaseTool]):
        self._tools[tool_class.name] = tool_class

    def get_tool(self, name: str, creds: Credentials) -> BaseTool | None:
        tool_class = self._tools.get(name)
        if not tool_class:
            return None
        return tool_class(creds)

    def available_tools(self) -> list[str]:
        return list(self._tools.keys())


# global registry instance — imported everywhere
registry = ToolRegistry()


def setup_registry():
    """Call this once on startup to register all tools."""
    from tools.gmail_tool import GmailTool
    from tools.calendar_tool import CalendarTool
    from tools.drive_tool import DriveTool

    registry.register(GmailTool)
    registry.register(CalendarTool)
    registry.register(DriveTool)