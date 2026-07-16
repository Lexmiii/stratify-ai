from abc import ABC, abstractmethod
from google.oauth2.credentials import Credentials


class BaseTool(ABC):
    """Every tool inherits from this. Keeps the registry clean and consistent."""

    name: str = ""
    description: str = ""

    def __init__(self, creds: Credentials):
        self.creds = creds

    @abstractmethod
    def run(self, params: dict) -> dict:
        """
        Execute the tool with the given params.
        Always returns a dict with at least:
          - success: bool
          - data: any
          - error: str | None
        """
        pass