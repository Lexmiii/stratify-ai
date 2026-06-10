import re

LIVE_FACT_KEYWORDS = [
    "now", "right now", "current", "today", "this year",
    "latest", "price", "worth", "who is", "president",
    "population", "weather", "time", "release", "version",
    "update", "2025", "2026"
]


def is_live_fact_query(text: str) -> bool:
    """
    Detects if the query requires real-time or up-to-date information.
    """

    text_lower = text.lower()

    # keyword match
    for word in LIVE_FACT_KEYWORDS:
        if word in text_lower:
            return True

    # regex patterns (strong signals)
    patterns = [
        r"who is .* president",
        r"what is .* price",
        r"latest .*",
        r".* now$",
        r".* today$"
    ]

    for p in patterns:
        if re.search(p, text_lower):
            return True

    return False