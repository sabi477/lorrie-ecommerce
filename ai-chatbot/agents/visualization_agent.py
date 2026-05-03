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
        SystemMessage(content=f"""You are a data visualization expert.
Decide if the data needs a chart.

If YES, return a valid Plotly JSON object with "data" and "layout" keys ONLY.
No markdown, no backticks, no Python code, no explanation — pure JSON.

If NO, return just the word: NO_CHART

A chart is needed for: comparisons, trends, distributions, rankings (2+ rows).
A chart is NOT needed for: single numbers, yes/no answers, simple text results.

IMPORTANT:
- All chart titles, axis labels, and legend text must be in {lang_name}.
- Do NOT mix languages in the chart.
- For horizontal bar charts, always set "orientation": "h" inside the trace AND put category labels in "y", numeric values in "x".
- Keep category labels short (max 20 chars). If a label is longer, abbreviate it.

Vertical bar chart example:
{{"data": [{{"type": "bar", "x": ["A", "B", "C"], "y": [10, 25, 15], "marker": {{"color": "#f27a1a"}}}}], "layout": {{"title": "Satış Özeti", "xaxis": {{"title": "Ürün"}}, "yaxis": {{"title": "Adet"}}}}}}

Horizontal bar chart example:
{{"data": [{{"type": "bar", "orientation": "h", "y": ["Fiyat ($)", "Stok", "Puan"], "x": [29.99, 98, 4.58], "marker": {{"color": "#6366f1"}}}}], "layout": {{"title": "Ürün Özeti", "xaxis": {{"title": "Değer"}}, "yaxis": {{"title": ""}}}}}}"""),
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