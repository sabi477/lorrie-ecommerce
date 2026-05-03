from llm import llm
from langchain_core.messages import SystemMessage, HumanMessage
import json
import logging

logger = logging.getLogger("chatbot")


def analysis_agent(state):
    question     = state["question"]
    query_result = state["query_result"]
    sql          = state["sql_query"]
    lang         = state.get("lang", "EN")
    lang_name    = "Turkish" if lang == "TR" else "English"

    if not query_result:
        return {
            **state,
            "final_answer": (
                "Sorunuzla ilgili herhangi bir veri bulunamadı."
                if lang == "TR" else
                "No data found for your question."
            ),
            "visualization_code": None,
        }

    needs_chart = isinstance(query_result, list) and len(query_result) >= 2

    chart_instruction = (
        """
Task 2 (CHART): The data has multiple rows — decide if a Plotly chart would help.
- If YES: include a valid Plotly JSON with "data" and "layout" keys as the "chart" value.
- If NO: set "chart" to null.
Chart is useful for comparisons, trends, rankings. Not needed for single values or text.
All chart labels/titles must be in {lang_name}."""
        if needs_chart else
        """
Task 2 (CHART): Only 1 row of data — set "chart" to null."""
    ).format(lang_name=lang_name)

    messages = [
        SystemMessage(content=f"""You are a helpful e-commerce data analyst.

Task 1 (ANALYSIS): Analyze the SQL query results in 3-5 sentences.
- Highlight key numbers and insights.
- Be friendly and professional.
- Respond ONLY in {lang_name}.
- IMPORTANT: When responding about orders, products, or any data that has a direct URL link, you MUST include clickable HTML links.
  - For orders: use URL pattern /customer/order-detail/{{{{id}}}} → <a href="/customer/order-detail/{{{{id}}}}">Sipariş #{{{{id}}}}</a>
  - For products: use URL pattern /product-detail/{{{{id}}}} → <a href="/product-detail/{{{{id}}}}">{{{{name}}}}</a>
  - Example in Turkish: "En pahalı siparişiniz 5,999₺ - <a href="/customer/order-detail/124">Sipariş #124</a> sayfasından detayları görün"
  - Example in English: "Your most expensive order is $5,999 - view details at <a href="/customer/order-detail/124">Order #124</a>"
  - Always use relative URLs starting with / (they will work in the app)
  - Include the link immediately after mentioning the item, don't just mention "link below"
{chart_instruction}

CRITICAL: Respond with ONLY valid JSON — no markdown, no backticks, no extra text.
Format:
{{"answer": "<your analysis with HTML links where relevant>", "chart": <plotly_json_or_null>}}"""),
        HumanMessage(content=f"""Question: {question}

SQL used:
{sql}

Results:
{query_result}""")
    ]

    response = llm.invoke(messages)
    raw = response.content.strip().replace("```json", "").replace("```", "").strip()

    # JSON parse et
    try:
        parsed = json.loads(raw)
        answer = parsed.get("answer", "").strip()
        chart  = parsed.get("chart")

        # chart geçerli JSON mu kontrol et
        if chart is not None:
            if isinstance(chart, str):
                try:
                    json.loads(chart)
                    viz_code = chart
                except Exception:
                    viz_code = None
            elif isinstance(chart, dict):
                viz_code = json.dumps(chart)
            else:
                viz_code = None
        else:
            viz_code = None

    except Exception:
        # JSON parse hatası → ham yanıtı cevap olarak kullan, grafik yok
        logger.warning("ANALYSIS_PARSE_ERROR | raw=%.120r", raw)
        answer   = raw if raw else ("Veri analizi yapılamadı." if lang == "TR" else "Could not analyze data.")
        viz_code = None

    return {
        **state,
        "final_answer":       answer,
        "visualization_code": viz_code,
    }
