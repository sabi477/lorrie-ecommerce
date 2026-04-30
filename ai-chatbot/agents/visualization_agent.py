from llm import llm
from langchain_core.messages import SystemMessage, HumanMessage
import json

def visualization_agent(state):
    question = state["question"]
    query_result = state["query_result"]
    lang = state.get("lang", "EN")
    lang_name = "Turkish" if lang == "TR" else "English"

    if not query_result or len(query_result) < 2:
        return {
            **state,
            "visualization_code": None
        }

    messages = [
        SystemMessage(content="""You are a data visualization expert.
Decide if the data needs a chart.

If YES, return a valid Plotly JSON object with "data" and "layout" keys ONLY.
No markdown, no backticks, no Python code, no explanation — pure JSON.

If NO, return just the word: NO_CHART

A chart is needed for: comparisons, trends, distributions, rankings (2+ rows).
A chart is NOT needed for: single numbers, yes/no answers, simple text results.

IMPORTANT:
- All chart titles, axis labels, and legend text must be in {lang_name}.
- Do NOT mix languages in the chart.

Example output format:
{"data": [{"type": "bar", "x": ["A", "B", "C"], "y": [10, 25, 15], "marker": {"color": "#f27a1a"}}], "layout": {"title": "Satış Özeti", "xaxis": {"title": "Ürün"}, "yaxis": {"title": "Adet"}}}"""),
        HumanMessage(content=f"""Question: {question}

Data:
{query_result}

Return Plotly JSON or NO_CHART.""")
    ]

    response = llm.invoke(messages)
    result = response.content.strip()

    if "NO_CHART" in result:
        return {
            **state,
            "visualization_code": None
        }

    cleaned = result.replace("```json", "").replace("```", "").strip()

    try:
        json.loads(cleaned)  # validate JSON
    except Exception:
        return {**state, "visualization_code": None}

    return {
        **state,
        "visualization_code": cleaned
    }