def format_sources(sources: list) -> str:
    if not sources:
        return ""

    formatted = ["**Sources:**"]

    for i, s in enumerate(sources[:4], 1):
        title = s.get("title", "Source")
        url = s.get("url", "")  # fixed: was "link", should be "url"

        if url:
            formatted.append(f"{i}. [{title}]({url})")

    if len(formatted) == 1:
        return ""

    return "\n".join(formatted)