import os
from tavily import TavilyClient
from dotenv import load_dotenv

load_dotenv()

client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

# Simple in-memory cache
SEARCH_CACHE = {}

def search_web(query: str, max_results: int = 5) -> dict:
    # Check cache first
    if query in SEARCH_CACHE:
        print(f"Cache hit: {query}")
        return SEARCH_CACHE[query]

    try:
        response = client.search(
            query=query,
            search_depth="advanced",
            max_results=max_results,
            include_answer=True,
            include_raw_content=False,
        )

        results = []
        for r in response.get("results", []):
            results.append({
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "content": r.get("content", ""),
                "score": r.get("score", 0),
            })

        data = {
            "success": True,
            "answer": response.get("answer", ""),
            "results": results,
            "query": query,
        }

        # Save to cache
        SEARCH_CACHE[query] = data
        return data

    except Exception as e:
        return {
            "success": False,
            "answer": "",
            "results": [],
            "query": query,
            "error": str(e),
        }