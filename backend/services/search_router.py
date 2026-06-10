import json
import re

from services.groq_service import get_groq_client


CLASSIFIER_PROMPT = """
You are a query routing classifier.

Determine whether answering the user's query requires:
- current information
- real-world facts
- news
- release dates
- updates
- live information
- web verification

Return ONLY valid JSON.

Format:

{
  "needs_web": true,
  "confidence": 0.95,
  "reason": "short explanation"
}

Rules:

needs_web = true for:
- release dates
- movies
- TV shows
- seasons
- episodes
- news
- updates
- latest information
- current events
- prices
- stocks
- weather
- anything time-sensitive

needs_web = false for:
- coding help
- explanations
- brainstorming
- math
- writing
- creative tasks
- general advice

User query:
{query}
"""


def classify_query(message: str) -> dict:
    try:
        client = get_groq_client()

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            messages=[
                {
                    "role": "user",
                    "content": CLASSIFIER_PROMPT.format(
                        query=message
                    ),
                }
            ],
        )

        text = response.choices[0].message.content

        match = re.search(r"\{.*\}", text, re.DOTALL)

        if not match:
            return {
                "needs_web": True,
                "confidence": 0.0,
                "reason": "classifier failed"
            }

        result = json.loads(match.group())

        if result.get("confidence", 0) < 0.75:
            result["needs_web"] = True

        return result

    except Exception:
        return {
            "needs_web": True,
            "confidence": 0.0,
            "reason": "classifier error"
        }


def needs_web_search(message: str) -> bool:
    result = classify_query(message)
    return result.get("needs_web", True)