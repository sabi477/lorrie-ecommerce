from llm import llm
from langchain_core.messages import SystemMessage, HumanMessage
from sql_agent import _filter_present_in_sql, is_dangerous_sql
import logging

logger = logging.getLogger("chatbot")
MAX_ITERATIONS = 3

def error_agent(state):
    sql = state["sql_query"]
    error = state["error"]
    question = state["question"]
    iteration_count = state["iteration_count"]
    user_role = state.get("user_role", "INDIVIDUAL")
    user_id = state.get("user_id")
    store_id = state.get("store_id")

    logger.warning("SQL_ERROR | iteration=%d error=%.120r", iteration_count, error)

    # max retry aşıldıysa pes et
    if iteration_count >= MAX_ITERATIONS:
        lang = state.get("lang", "EN")
        final_msg = (
            "İsteğiniz birden fazla denemeden sonra işlenemedi. Lütfen sorunuzu farklı bir şekilde sormayı deneyin."
            if lang == "TR" else
            "I was unable to process your request after multiple attempts. Please try rephrasing your question."
        )
        return {
            **state,
            "sql_query": None,
            "error": None,
            "final_answer": final_msg,
            "iteration_count": iteration_count
        }

    messages = [
        SystemMessage(content="""You are an SQL error recovery specialist.
Fix the broken SQL query based on the error message.
RULES:
1. Return ONLY a SELECT statement.
2. No markdown, no backticks, no explanation.
3. Just the raw fixed SQL."""),
        HumanMessage(content=f"""Original question: {question}

Broken SQL:
{sql}

Error:
{error}

Return the fixed SQL only.""")
    ]

    response = llm.invoke(messages)
    fixed_sql = response.content.strip()
    fixed_sql = fixed_sql.replace("```sql", "").replace("```", "").strip()

    # Tehlikeli DML kontrolü
    if is_dangerous_sql(fixed_sql):
        logger.warning("ERROR_AGENT_DANGEROUS_SQL | role=%s sql=%.120r", user_role, fixed_sql)
        return {
            **state,
            "sql_query": "SELECT 'Access denied' as message;",
            "error": None,
            "iteration_count": iteration_count + 1
        }

    # password_hash / information_schema kontrolü
    if "password_hash" in fixed_sql.lower() or "password" in fixed_sql.lower():
        logger.warning("ERROR_AGENT_PASSWORD_LEAK | role=%s", user_role)
        return {
            **state,
            "sql_query": "SELECT 'Access denied' as message;",
            "error": None,
            "iteration_count": iteration_count + 1
        }

    # Rol filtresi hâlâ geçerli mi?
    if not _filter_present_in_sql(fixed_sql, user_role, user_id, store_id):
        logger.error("ERROR_AGENT_FILTER_MISSING | role=%s sql=%.120r", user_role, fixed_sql)
        return {
            **state,
            "sql_query": "SELECT 'Access denied: role filter not applied' as message;",
            "error": None,
            "iteration_count": iteration_count + 1
        }

    return {
        **state,
        "sql_query": fixed_sql,
        "error": None,
        "iteration_count": iteration_count + 1
    }