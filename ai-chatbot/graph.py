from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END
from agents.guardrails import guardrails_agent
from agents.sql_agent import sql_agent
from agents.execute_sql import execute_sql
from agents.error_agent import error_agent
from agents.analysis_agent import analysis_agent

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
    lang: str  # "TR" | "EN" — browser Accept-Language'dan gelir
    guardrail_event: Optional[dict]   # structured security event info
    execution_meta: Optional[dict]    # row_count, elapsed_time

def route_after_guardrails(state: AgentState):
    if state["is_in_scope"]:
        return "sql_agent"
    return END

def route_after_sql(state: AgentState):
    # error_agent max retry'da final_answer set eder; direkt END'e git
    if state.get("final_answer"):
        return END
    if state.get("error") and state["iteration_count"] < 3:
        return "error_agent"
    return "analysis_agent"

graph = StateGraph(AgentState)
graph.add_node("guardrails",   guardrails_agent)
graph.add_node("sql_agent",    sql_agent)
graph.add_node("execute_sql",  execute_sql)
graph.add_node("error_agent",  error_agent)
graph.add_node("analysis_agent", analysis_agent)

graph.set_entry_point("guardrails")
graph.add_conditional_edges("guardrails", route_after_guardrails)
graph.add_edge("sql_agent",    "execute_sql")
graph.add_conditional_edges("execute_sql", route_after_sql)
graph.add_edge("error_agent",  "execute_sql")
graph.add_edge("analysis_agent", END)

app = graph.compile()
