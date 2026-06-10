import json
import re
from typing import TypedDict, List
from langgraph.graph import StateGraph, END

from services.groq_service import get_groq_client
from services.search_service import search_web
from services.search_router import needs_web_search
from services.research_service import create_research_notes, extract_sources
from services.live_fact_detector import is_live_fact_query
from services.source_formatter import format_sources

from prompts.planner_prompt import (
    ROUTER_PROMPT,
    EMOTIONAL_PROMPT,
    CASUAL_PROMPT,
    PLANNER_PROMPT,
    REASONER_PROMPT,
    ROADMAP_PROMPT
)

class AgentState(TypedDict):
    goal: str
    message_type: str
    subproblems: List[str]
    timeframe: str
    analysis: str
    roadmap: dict
    direct_response: str
    error: str
    research_notes: str
    sources: List[dict]
    used_search: bool
    verification_required: bool
    verified: bool
    show_sources: bool

def call_groq(prompt: str, temperature: float = 0.7) -> str:
    client = get_groq_client()
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
    )
    return response.choices[0].message.content

def extract_json(text: str) -> dict:
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except:
            return {}
    return {}

def router_node(state: AgentState) -> AgentState:
    prompt = ROUTER_PROMPT.format(goal=state["goal"])
    response = call_groq(prompt, temperature=0.1).strip().upper()
    if "EMOTIONAL" in response:
        state["message_type"] = "EMOTIONAL"
    elif "CASUAL" in response:
        state["message_type"] = "CASUAL"
    else:
        state["message_type"] = "PLANNING"
    return state

def search_node(state: AgentState) -> AgentState:
    if state["message_type"] == "EMOTIONAL":
        state["research_notes"] = ""
        state["sources"] = []
        state["used_search"] = False
        state["verification_required"] = False
        state["verified"] = True
        state["show_sources"] = False
        return state

    goal = state["goal"]

    # Show sources mode
    state["show_sources"] = (
    "source" in goal.lower() or
    "link" in goal.lower() or
    "proof" in goal.lower() or
    "where did you" in goal.lower() or
    "sources for" in goal.lower() or
    "give me sources" in goal.lower() or
    "show sources" in goal.lower()
)

    # Decide if search needed
    should_search = needs_web_search(goal) or is_live_fact_query(goal) or state.get("show_sources", False)
    state["verification_required"] = should_search

    if should_search:
        search_data = search_web(goal)
        results = search_data.get("results", []) if search_data else []

        if search_data and search_data.get("success") and len(results) > 0:
            state["research_notes"] = create_research_notes(search_data)
            state["sources"] = extract_sources(search_data)
            state["used_search"] = True
            state["verified"] = True
        else:
            state["research_notes"] = ""
            state["sources"] = []
            state["used_search"] = False
            state["verified"] = False
    else:
        state["research_notes"] = ""
        state["sources"] = []
        state["used_search"] = False
        state["verified"] = True

    return state

def emotional_node(state: AgentState) -> AgentState:
    prompt = EMOTIONAL_PROMPT.format(goal=state["goal"])
    response = call_groq(prompt, temperature=0.8)
    state["direct_response"] = response
    state["roadmap"] = {
        "recommendation": response,
        "why": "",
        "tradeoffs": [],
        "roadmap": [],
        "milestones": []
    }
    return state

def casual_node(state: AgentState) -> AgentState:

    # Hard truth lock
    if state.get("verification_required", False) and not state.get("verified", False):
        state["direct_response"] = "I don't have verified information on this right now."
        state["sources"] = []
        state["roadmap"] = {
            "recommendation": state["direct_response"],
            "why": "", "tradeoffs": [], "roadmap": [], "milestones": []
        }
        return state

    research = state.get("research_notes", "")

    # 🔥 FIX 1 — SOURCE MODE OVERRIDE (FIRST CHECK)
    if state.get("show_sources", False):
        sources_text = format_sources(state.get("sources", []))
        state["direct_response"] = sources_text if sources_text else "No sources available."
        state["roadmap"] = {
            "recommendation": state["direct_response"],
            "why": "", "tradeoffs": [], "roadmap": [], "milestones": []
        }
        return state

    # 🔥 FIX 2 — CLEAN PROMPT WITH SOURCE INJECTION
    sources_text = format_sources(state.get("sources", []))

    prompt = CASUAL_PROMPT.format(goal=state["goal"])

    if research:
        prompt += f"\n\nUse this research:\n{research}"

    if sources_text:
        prompt += f"\n\nSources:\n{sources_text}"

    response = call_groq(prompt, temperature=0.7)

    # 🔥 FIX 3 — FINAL FACT SAFETY CHECK
    if state.get("verification_required", False):
        if not state.get("sources"):
            state["direct_response"] = "I don't have verified information on this right now."
            state["roadmap"] = {
                "recommendation": state["direct_response"],
                "why": "", "tradeoffs": [], "roadmap": [], "milestones": []
            }
            return state

    state["direct_response"] = response
    state["roadmap"] = {
        "recommendation": response,
        "why": "", "tradeoffs": [], "roadmap": [], "milestones": []
    }
    return state

def planning_node(state: AgentState) -> AgentState:
    if state.get("verification_required", False) and not state.get("verified", False):
        state["subproblems"] = []
        state["timeframe"] = ""
        state["analysis"] = "No verified data available."
        return state

    research = state.get("research_notes", "")
    if research:
        prompt = f"{PLANNER_PROMPT.format(goal=state['goal'])}\n\nResearch:\n{research}"
    else:
        prompt = PLANNER_PROMPT.format(goal=state["goal"])

    response = call_groq(prompt, temperature=0.4)
    data = extract_json(response)
    state["subproblems"] = data.get("subproblems", ["Analyze goal", "Research options", "Create plan"])
    state["timeframe"] = data.get("timeframe", "4 weeks")
    return state

def reasoning_node(state: AgentState) -> AgentState:
    prompt = REASONER_PROMPT.format(
        goal=state["goal"],
        subproblems=", ".join(state["subproblems"]),
        timeframe=state["timeframe"]
    )
    if state.get("research_notes"):
        prompt += f"\n\nResearch Notes:\n{state['research_notes']}"

    state["analysis"] = call_groq(prompt, temperature=0.5)
    return state

def roadmap_node(state: AgentState) -> AgentState:
    prompt = ROADMAP_PROMPT.format(
        goal=state["goal"],
        timeframe=state["timeframe"],
        analysis=state["analysis"]
    )
    response = call_groq(prompt, temperature=0.4)
    data = extract_json(response)
    state["roadmap"] = data if data else {
        "recommendation": response,
        "roadmap": []
    }
    return state

def blocked_node(state: AgentState) -> AgentState:
    state["direct_response"] = "I don't have verified information on this right now."
    state["sources"] = []
    state["roadmap"] = {
        "recommendation": state["direct_response"],
        "why": "",
        "tradeoffs": [],
        "roadmap": [],
        "milestones": []
    }
    return state

def route_message(state: AgentState) -> str:
    if state.get("verification_required", False) and not state.get("verified", False):
        return "blocked"
    if state["message_type"] == "EMOTIONAL":
        return "emotional"
    elif state["message_type"] == "CASUAL":
        return "casual"
    else:
        return "planning"

def build_strategy_graph():
    workflow = StateGraph(AgentState)
    workflow.add_node("router", router_node)
    workflow.add_node("search", search_node)
    workflow.add_node("emotional", emotional_node)
    workflow.add_node("casual", casual_node)
    workflow.add_node("planning", planning_node)
    workflow.add_node("reasoning", reasoning_node)
    workflow.add_node("roadmap", roadmap_node)
    workflow.add_node("blocked", blocked_node)
    workflow.set_entry_point("router")
    workflow.add_edge("router", "search")
    workflow.add_conditional_edges("search", route_message, {
        "emotional": "emotional",
        "casual": "casual",
        "planning": "planning",
        "blocked": "blocked"
    })
    workflow.add_edge("emotional", END)
    workflow.add_edge("casual", END)
    workflow.add_edge("planning", "reasoning")
    workflow.add_edge("reasoning", "roadmap")
    workflow.add_edge("roadmap", END)
    workflow.add_edge("blocked", END)
    return workflow.compile()