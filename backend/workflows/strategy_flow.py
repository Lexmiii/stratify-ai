import json
import re
from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from services.groq_service import get_groq_client
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

def call_groq(prompt: str) -> str:
    client = get_groq_client()
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
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
    response = call_groq(prompt).strip().upper()
    if "EMOTIONAL" in response:
        state["message_type"] = "EMOTIONAL"
    elif "CASUAL" in response:
        state["message_type"] = "CASUAL"
    else:
        state["message_type"] = "PLANNING"
    return state

def emotional_node(state: AgentState) -> AgentState:
    prompt = EMOTIONAL_PROMPT.format(goal=state["goal"])
    response = call_groq(prompt)
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
    prompt = CASUAL_PROMPT.format(goal=state["goal"])
    response = call_groq(prompt)
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
    prompt = PLANNER_PROMPT.format(goal=state["goal"])
    response = call_groq(prompt)
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
    response = call_groq(prompt)
    state["analysis"] = response
    return state

def roadmap_node(state: AgentState) -> AgentState:
    prompt = ROADMAP_PROMPT.format(
        goal=state["goal"],
        timeframe=state["timeframe"],
        analysis=state["analysis"]
    )
    response = call_groq(prompt)
    data = extract_json(response)
    if data:
        state["roadmap"] = data
    else:
        state["roadmap"] = {
            "recommendation": response,
            "roadmap": []
        }
    return state

def route_message(state: AgentState) -> str:
    if state["message_type"] == "EMOTIONAL":
        return "emotional"
    elif state["message_type"] == "CASUAL":
        return "casual"
    else:
        return "planning"

def build_strategy_graph():
    workflow = StateGraph(AgentState)
    workflow.add_node("router", router_node)
    workflow.add_node("emotional", emotional_node)
    workflow.add_node("casual", casual_node)
    workflow.add_node("planning", planning_node)
    workflow.add_node("reasoning", reasoning_node)
    workflow.add_node("roadmap", roadmap_node)
    workflow.set_entry_point("router")
    workflow.add_conditional_edges("router", route_message, {
        "emotional": "emotional",
        "casual": "casual",
        "planning": "planning"
    })
    workflow.add_edge("emotional", END)
    workflow.add_edge("casual", END)
    workflow.add_edge("planning", "reasoning")
    workflow.add_edge("reasoning", "roadmap")
    workflow.add_edge("roadmap", END)
    return workflow.compile()