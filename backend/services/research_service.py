TRUSTED_DOMAINS = {
    "github.com": 10,
    "openai.com": 10,
    "anthropic.com": 10,
    "microsoft.com": 9,
    "google.com": 9,
    "apple.com": 9,
    "reuters.com": 9,

    "wikipedia.org": 8,
    "stackoverflow.com": 8,
    "netflix.com": 8,
    "bbc.com": 8,
    "imdb.com": 8,
    "bloomberg.com": 8,
    "nytimes.com": 8,

    "techcrunch.com": 7,
    "theverge.com": 7,
    "youtube.com": 7,
    "forbes.com": 7,

    "reddit.com": 6,
    "medium.com": 6,
}


def get_trust_score(url: str) -> int:
    url = url.lower()

    for domain, score in TRUSTED_DOMAINS.items():
        if domain in url:
            return score

    return 5


def create_research_notes(search_data: dict) -> str:
    """
    Convert raw Tavily results into structured research notes
    that Lexi can reason over.
    """

    if not search_data.get("results"):
        return ""

    scored_results = []

    for result in search_data["results"]:

        scored_results.append({
            **result,
            "trust_score": get_trust_score(
                result.get("url", "")
            )
        })

    scored_results.sort(
        key=lambda x: (
            x["trust_score"],
            x.get("score", 0)
        ),
        reverse=True
    )

    official_sources = [
        r for r in scored_results
        if r["trust_score"] >= 8
    ]

    supporting_sources = [
        r for r in scored_results
        if r["trust_score"] < 8
    ]

    notes = []

    notes.append("RESEARCH BRIEFING")
    notes.append("=" * 30)

    if search_data.get("answer"):
        notes.append(
            f"\nResearch Summary:\n"
            f"{search_data['answer']}\n"
        )

    notes.append(
        f"Source Count: {len(scored_results)}"
    )

    if official_sources:

        notes.append("\nOfficial / High Trust Sources:")

        for source in official_sources[:3]:

            content = (
                source.get("content", "")
                .replace("\n", " ")
                .strip()
            )[:250]

            notes.append(
                f"- {source['title']}"
            )

            notes.append(
                f"  Evidence: {content}"
            )

            notes.append(
                f"  Source: {source['url']}"
            )

    if supporting_sources:

        notes.append("\nAdditional Context:")

        for source in supporting_sources[:2]:

            content = (
                source.get("content", "")
                .replace("\n", " ")
                .strip()
            )[:180]

            notes.append(
                f"- {source['title']}"
            )

            notes.append(
                f"  Evidence: {content}"
            )

            notes.append(
                f"  Source: {source['url']}"
            )

    notes.append(
        "\nInstructions:"
    )

    notes.append(
        "- Treat high-trust sources as more reliable."
    )

    notes.append(
        "- If sources disagree, mention uncertainty."
    )

    notes.append(
        "- Do not copy snippets verbatim."
    )

    notes.append(
        "- Use the briefing as evidence, not as the final answer."
    )

    return "\n".join(notes)


def extract_sources(search_data: dict) -> list:
    """
    Extract clean source metadata
    for frontend display.
    """

    sources = []

    for result in search_data.get("results", [])[:4]:

        sources.append({
            "title": result.get("title", ""),
            "url": result.get("url", ""),
            "trust_score": get_trust_score(
                result.get("url", "")
            ),
        })

    return sources