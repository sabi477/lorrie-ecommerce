from llm import llm
from langchain_core.messages import SystemMessage, HumanMessage

def analysis_agent(state):
    question = state["question"]
    query_result = state["query_result"]
    sql = state["sql_query"]
    lang = state.get("lang", "EN")
    lang_name = "Turkish" if lang == "TR" else "English"

    if not query_result:
        return {
            **state,
            "final_answer": (
                "Sorunuzla ilgili herhangi bir veri bulunamadı."
                if lang == "TR" else
                "No data found for your question."
            )
        }

    messages = [
        SystemMessage(content=f"""You are a helpful e-commerce data analyst.
Analyze the query results and explain them clearly.

IMPORTANT: Always respond in {lang_name}. Do NOT mix languages.
- Always include key numbers and insights.
- Keep it under 5 sentences.
- Be friendly and professional."""),
        HumanMessage(content=f"""Question: {question}

SQL used:
{sql}

Results:
{query_result}

Provide a clear analysis in {lang_name}.""")
    ]

    response = llm.invoke(messages)

    return {
        **state,
        "final_answer": response.content.strip()
    }