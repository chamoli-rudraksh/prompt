# backend/agents/graph.py

from langgraph.graph import StateGraph, END
from agents.state import AgentState
from agents.ingestion_agent import ingestion_agent
from agents.processing_agent import processing_agent
from agents.relevance_agent import relevance_agent
from agents.briefing_agent import briefing_agent
from agents.story_agent import story_agent


def route_after_ingestion(state: AgentState) -> str:
    """Decide what runs after ingestion."""
    if state["task"] == "ingest":
        return "processing"
    return END


def route_after_relevance(state: AgentState) -> str:
    """Decide what runs after relevance search."""
    if state["task"] == "briefing":
        return "briefing"
    if state["task"] == "story":
        return "story"
    return END


def build_ingest_graph():
    """Graph for the background ingestion job."""
    graph = StateGraph(AgentState)
    graph.add_node("ingestion", ingestion_agent)
    graph.add_node("processing", processing_agent)
    graph.set_entry_point("ingestion")
    graph.add_edge("ingestion", "processing")
    graph.add_edge("processing", END)
    return graph.compile()


def build_briefing_graph():
    """Graph for navigator briefing requests."""
    graph = StateGraph(AgentState)
    graph.add_node("relevance", relevance_agent)
    graph.add_node("briefing", briefing_agent)
    graph.set_entry_point("relevance")
    graph.add_edge("relevance", "briefing")
    graph.add_edge("briefing", END)
    return graph.compile()


def build_story_graph():
    """Graph for story arc requests."""
    graph = StateGraph(AgentState)
    graph.add_node("story", story_agent)
    graph.set_entry_point("story")
    graph.add_edge("story", END)
    return graph.compile()


# Compile all graphs once at import time
ingest_graph = build_ingest_graph()
briefing_graph = build_briefing_graph()
story_graph = build_story_graph()


def make_initial_state(task: str, **kwargs) -> AgentState:
    """Helper to create a clean starting state."""
    return AgentState(
        task=task,
        user_id=kwargs.get("user_id"),
        query=kwargs.get("query"),
        conversation_id=kwargs.get("conversation_id"),
        raw_articles=[],
        enriched_articles=[],
        relevant_articles=[],
        feed_articles=[],
        briefing=None,
        story_arc=None,
        current_agent="",
        retry_count=0,
        errors=[],
        status="running",
        logs=[],
    )