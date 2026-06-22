import json
import re
from typing import TypedDict, List, Optional
from langgraph.graph import StateGraph, END

from services.groq_service import get_groq_client
from services.search_service import search_web
from services.search_router import needs_web_search
from services.research_service import create_research_notes, extract_sources
from services.live_fact_detector import is_live_fact_query
from services.source_formatter import format_sources
from services.response_formatter import format_answer

from prompts.planner_prompt import (
    ROUTER_PROMPT,
    EMOTIONAL_PROMPT,
    CASUAL_PROMPT,
    TUTOR_PROMPT,
    FRIEND_PROMPT,
    INTERVIEW_COACH_PROMPT,
    PLANNER_PROMPT,
    REASONER_PROMPT,
    ROADMAP_PROMPT
)

def reset_temporary_fields(state: "AgentState") -> "AgentState":
    state["research_notes"] = state.get("research_notes", "")
    state["sources"] = state.get("sources", [])
    state["used_search"] = state.get("used_search", False)
    state["show_sources"] = state.get("show_sources", False)
    state["verification_required"] = state.get("verification_required", False)
    return state

class AgentState(TypedDict):
    goal: str
    history_context: str
    mode: str  # NEW
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
    match = re.search(r'\{[\s\S]*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except:
            return {}
    return {}

def lexi_already_asked_question(history: str) -> bool:
    if not history:
        return False
    lexi_lines = [
        line for line in history.split("\n")
        if line.strip().startswith("Lexi:")
    ]
    for line in lexi_lines:
        if "?" in line:
            return True
    return False

def get_mode_prompt(state: "AgentState", base_prompt: str) -> str:
    """
    For non-planning message types, override the prompt based on active mode.
    Planner mode uses existing CASUAL/EMOTIONAL flow.
    Tutor/Friend/Interview Coach get their own prompt entirely.
    """
    mode = state.get("mode", "Planner")
    goal = state["goal"]
    history = state.get("history_context", "")
    research = state.get("research_notes", "")

    # These modes completely replace the casual/emotional prompt
    if mode == "Tutor":
        prompt = TUTOR_PROMPT.format(goal=goal)
    elif mode == "Friend":
        prompt = FRIEND_PROMPT.format(goal=goal)
    elif mode == "Interview coach":
        prompt = INTERVIEW_COACH_PROMPT.format(goal=goal)
    else:
        # Planner mode — use the base prompt as-is
        prompt = base_prompt

    if history:
        prompt += f"\n\nConversation so far:\n{history}\n\nNow respond to the latest message only."
    if research:
        prompt += f"\n\nUse this information if relevant:\n{research}"

    return prompt

def router_node(state: AgentState) -> AgentState:
    mode = state.get("mode", "Planner")

    # Interview Coach always routes to CASUAL so it hits the right node
    # but the node will use the coach prompt based on mode
    if mode == "Interview coach":
        state["message_type"] = "CASUAL"
        state = reset_temporary_fields(state)
        return state

    prompt = ROUTER_PROMPT.format(goal=state["goal"])
    response = call_groq(prompt, temperature=0.1).strip().upper()

    if "EMOTIONAL" in response:
        state["message_type"] = "EMOTIONAL"
    elif "CASUAL" in response:
        state["message_type"] = "CASUAL"
    else:
        state["message_type"] = "PLANNING"

    state = reset_temporary_fields(state)
    return state

def search_node(state: AgentState) -> AgentState:
    state = reset_temporary_fields(state)

    simple_messages = [
        "bye", "yes", "no", "ok", "okay", "thanks", "cool", "got it",
        "lol", "haha", "nice", "great", "sure", "nope", "yep", "alright",
        "fine", "noted", "thank you", "ty", "thx", "k", "kk", "yup",
        "goodbye", "see ya", "later", "cya", "whole", "yeah", "nah",
        "thank you bye", "thanks bye", "ok bye", "okay bye", "bye bye",
        "thank you so much", "sounds good", "got it thanks", "perfect",
        "nothing", "nothing thanks", "nothing thank you", "all good",
        "all", "im good", "i'm good", "okay nice", "ok nice", "nice one"
    ]
    if state["goal"].strip().lower() in simple_messages:
        state["research_notes"] = ""
        state["sources"] = []
        state["used_search"] = False
        state["verification_required"] = False
        state["verified"] = True
        state["search_failed"] = False
        return state

    if state["message_type"] == "EMOTIONAL":
        state["research_notes"] = ""
        state["sources"] = []
        state["used_search"] = False
        state["verification_required"] = False
        state["verified"] = True
        state["show_sources"] = False
        state["search_failed"] = False
        return state

    goal = state["goal"]

    state["show_sources"] = (
        "source" in goal.lower() or
        "link" in goal.lower() or
        "proof" in goal.lower() or
        "where did you" in goal.lower() or
        "sources for" in goal.lower() or
        "give me sources" in goal.lower() or
        "show sources" in goal.lower()
    )

    should_search = (
        needs_web_search(goal)
        or is_live_fact_query(goal)
        or state.get("show_sources", False)
    )

    state["verification_required"] = should_search

    if should_search:
        search_data = search_web(goal)
        results = search_data.get("results", []) if search_data else []

        if search_data and search_data.get("success"):
            if results and len(results) > 0:
                state["research_notes"] = create_research_notes(search_data)
                state["sources"] = extract_sources(search_data)
                state["used_search"] = True
                state["verified"] = True
                state["search_failed"] = False
            else:
                state["research_notes"] = ""
                state["sources"] = []
                state["used_search"] = False
                state["verified"] = False
                state["search_failed"] = True
        else:
            state["research_notes"] = ""
            state["sources"] = []
            state["used_search"] = False
            state["verified"] = False
            state["search_failed"] = True
    else:
        state["research_notes"] = ""
        state["sources"] = []
        state["used_search"] = False
        state["verified"] = True
        state["search_failed"] = False

    return state

def emotional_node(state: AgentState) -> AgentState:
    history = state.get("history_context", "")
    mode = state.get("mode", "Planner")

    # Friend mode handles emotional topics differently
    if mode == "Friend":
        prompt = get_mode_prompt(state, FRIEND_PROMPT.format(goal=state["goal"]))
    else:
        prompt = EMOTIONAL_PROMPT.format(goal=state["goal"])
        if history:
            prompt += f"\n\nConversation so far:\n{history}"
        if lexi_already_asked_question(history):
            prompt += "\n\nSTRICT OVERRIDE: You have ALREADY asked a question earlier. Do NOT ask any question in this response. Give direct help only, end with a statement."

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

def clean_style(text: str) -> str:
    fillers = [
        "Certainly!", "Absolutely!", "Of course!", "Sure!",
        "Great question!", "I'd be happy to", "I'm happy to",
        "As an AI", "As a language model",
    ]
    for filler in fillers:
        text = text.replace(filler, "")
    return text.strip()

def casual_node(state: AgentState) -> AgentState:
    state = reset_temporary_fields(state)

    if state.get("verification_required", False) and not state.get("verified", False):
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

    if state.get("show_sources", False):
        state["direct_response"] = "No sources available."
        if state.get("sources"):
            state["direct_response"] = format_sources(state["sources"])
        state["roadmap"] = {
            "recommendation": state["direct_response"],
            "why": "",
            "tradeoffs": [],
            "roadmap": [],
            "milestones": []
        }
        return state

    history = state.get("history_context", "")
    mode = state.get("mode", "Planner")

    # Build the base prompt depending on mode
    if mode == "Tutor":
        base_prompt = TUTOR_PROMPT.format(goal=state["goal"])
    elif mode == "Friend":
        base_prompt = FRIEND_PROMPT.format(goal=state["goal"])
    elif mode == "Interview coach":
        base_prompt = INTERVIEW_COACH_PROMPT.format(goal=state["goal"])
    else:
        base_prompt = CASUAL_PROMPT.format(goal=state["goal"])

    prompt = base_prompt

    # Short follow-up handling (only for default Planner/Casual mode)
    if mode == "Planner":
        short_followups = [
            "yes", "yeah", "yep", "sure", "ok", "okay",
            "explain like im 10", "explain like i'm 10",
            "simpler", "shorter", "more", "go on", "continue",
            "another one", "one more", "again", "nothing", "nothing thanks",
            "nothing thank you", "thank you", "okay nice", "ok nice", "nice one"
        ]
        if state["goal"].strip().lower() in short_followups and history:
            prompt += f"\n\nIMPORTANT: '{state['goal']}' is a short reply. Respond to the previous topic directly."

        if lexi_already_asked_question(history):
            prompt += "\n\nSTRICT OVERRIDE: You already asked a question. Do NOT ask another question. Give direct help or a practical toolkit. End with a statement."

    if history:
        prompt += f"\n\nConversation so far:\n{history}\n\nNow respond to the latest message only."

    if state.get("research_notes"):
        prompt += f"\n\nUse this information to answer:\n{state['research_notes']}"

    response = call_groq(prompt, temperature=0.7)
    response = clean_style(response)
    response = response.strip()

    if state.get("verification_required", False):
        if not state.get("sources") and not state.get("research_notes"):
            state["direct_response"] = "I don't have verified information on this right now."
            state["roadmap"] = {
                "recommendation": state["direct_response"],
                "why": "",
                "tradeoffs": [],
                "roadmap": [],
                "milestones": []
            }
            return state

    state["direct_response"] = response
    state["roadmap"] = {
        "recommendation": response,
        "why": "",
        "tradeoffs": [],
        "roadmap": [],
        "milestones": []
    }
    return state

def planning_node(state: AgentState) -> AgentState:
    if state.get("verification_required", False) and not state.get("verified", False):
        state["subproblems"] = []
        state["timeframe"] = ""
        state["analysis"] = "No verified data available."
        return state

    research = state.get("research_notes", "")
    history = state.get("history_context", "")

    prompt = PLANNER_PROMPT.format(goal=state["goal"])
    if history:
        prompt += f"\n\nConversation context:\n{history}"
    if research:
        prompt += f"\n\nResearch:\n{research}"

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