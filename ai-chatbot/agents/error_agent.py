from llm import llm
from langchain_core.messages import SystemMessage, HumanMessage
import logging

logger = logging.getLogger("chatbot")
MAX_ITERATIONS = 3

def error_agent(state):
    sql = state["sql_query"]
    error = state["error"]
    question = state["question"]
    iteration_count = state["iteration_count"]

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

    # düzeltilmiş SQL de tehlikeliyse reddet
    dangerous = ["drop", "delete", "truncate", "insert", "update", "alter"]
    if any(kw in fixed_sql.lower() for kw in dangerous):
        return {
            **state,
            "sql_query": "SELECT 'Access denied' as message;",
            "error": None,
            "iteration_count": iteration_count + 1
        }

    return {
        **state,
        "sql_query": fixed_sql,
        "error": None,
        "iteration_count": iteration_count + 1
    }