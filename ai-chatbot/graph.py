from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END
from agents.guardrails import guardrails_agent
from agents.sql_agent import sql_agent
from agents.execute_sql import execute_sql
from agents.error_agent import error_agent
from agents.analysis_agent import analysis_agent
from agents.intent_agent import intent_agent
from agents.mutation_agent import mutation_agent


class AgentState(TypedDict):
    question: str
    user_role: str
    is_logged_in: bool
    user_id: Optional[int]
    store_id: Optional[int]
    sql_query: Optional[str]
    query_result: Optional[list]
    error: Optional[str]
    final_answer: Optional[str]
    visualization_code: Optional[str]
    is_in_scope: Optional[bool]
    iteration_count: int
    lang: str                          # "TR" | "EN"
    guardrail_event: Optional[dict]
    execution_meta: Optional[dict]
    history: Optional[list[dict]]
    operation_type: Optional[str]      # "READ" | "WRITE_INTENT" | "WRITE_CONFIRM"
    pending_mutation: Optional[dict]   # extracted mutation payload


def route_after_guardrails(state: AgentState):
    op = state.get("operation_type", "READ")
    if op == "WRITE_INTENT":
        return "intent_agent"
    if op == "WRITE_CONFIRM":
        return "mutation_agent"
    if state.get("is_in_scope"):
        return "sql_agent"
    return END


def route_after_sql(state: AgentState):
    if state.get("final_answer"):
        return END
    if state.get("error"):
        if state["iteration_count"] < 3:
            return "error_agent"
        lang = state.get("lang", "EN")
        state["final_answer"] = (
            "İsteğiniz birden fazla denemeden sonra işlenemedi. Lütfen sorunuzu farklı bir şekilde sormayı deneyin."
            if lang == "TR" else
            "I was unable to process your request after multiple attempts. Please try rephrasing your question."
        )
        return END
    return "analysis_agent"


graph = StateGraph(AgentState)
graph.add_node("guardrails",     guardrails_agent)
graph.add_node("sql_agent",      sql_agent)
graph.add_node("execute_sql",    execute_sql)
graph.add_node("error_agent",    error_agent)
graph.add_node("analysis_agent", analysis_agent)
graph.add_node("intent_agent",   intent_agent)
graph.add_node("mutation_agent", mutation_agent)

graph.set_entry_point("guardrails")
graph.add_conditional_edges("guardrails", route_after_guardrails)
graph.add_edge("sql_agent",      "execute_sql")
graph.add_conditional_edges("execute_sql", route_after_sql)
graph.add_edge("error_agent",    "execute_sql")
graph.add_edge("analysis_agent", END)
graph.add_edge("intent_agent",   END)
graph.add_edge("mutation_agent", END)

app = graph.compile()
