import re

def remove_ai_narration(text: str) -> str:
    bad_phrases = [
        "here's what i found",
        "here is what i found",
        "based on the sources",
        "according to sources",
        "based on my research",
        "from the search results",
        "i found that",
        "here's what i found for you",
    ]

    cleaned = text

    for phrase in bad_phrases:
        cleaned = re.sub(
            rf".*{re.escape(phrase)}.*\n?",
            "",
            cleaned,
            flags=re.IGNORECASE
        )

    return cleaned.strip()


def format_answer(answer: str, sources_text: str = "") -> str:

    # 🔥 FIX 3: remove fake search narration
    answer = remove_ai_narration(answer)

    answer = answer.strip()

    if not sources_text:
        return answer

    return f"""{answer}

Sources:
{sources_text}
"""