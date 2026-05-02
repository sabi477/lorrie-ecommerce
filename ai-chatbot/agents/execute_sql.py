import requests
import os
import time

SPRING_BOOT_URL = os.getenv("SPRING_BOOT_URL", "http://localhost:8080")

def execute_sql(state):
    sql = state["sql_query"]

    if not sql:
        return state

    try:
        start = time.time()
        response = requests.post(
            f"{SPRING_BOOT_URL}/api/chat/execute",
            json={"query": sql},
            timeout=20
        )
        elapsed = round(time.time() - start, 2)

        if response.status_code == 200:
            result = response.json()
            row_count = len(result) if isinstance(result, list) else 1
            return {
                **state,
                "query_result": result,
                "error": None,
                "execution_meta": {"row_count": row_count, "elapsed_time": elapsed},
            }
        else:
            try:
                err_data = response.json()
                err_msg = err_data.get("error", response.text)
            except Exception:
                err_msg = response.text
            return {
                **state,
                "query_result": None,
                "error": f"SQL execution failed: {err_msg}",
            }

    except Exception as e:
        return {
            **state,
            "query_result": None,
            "error": str(e),
        }
