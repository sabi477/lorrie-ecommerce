from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from graph import app as graph_app
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from collections import defaultdict
from typing import Optional, Union
import unicodedata
import logging
import threading
import re
import time
import os
import concurrent.futures

load_dotenv()

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("chatbot")

if not os.getenv("OPENROUTER_API_KEY", "").strip():
    logger.warning(
        "OPENROUTER_API_KEY tanımlı değil. ai-chatbot/.env dosyasına anahtar ekleyin "
        "(örnek: .env.example). Sohbet istekleri başarısız olabilir."
    )

# ── Observability (in-memory metrics) ───────────────────────────────────────
_metrics = {
    "requests_total":       0,
    "requests_success":     0,
    "requests_error":       0,
    "guardrails_triggered": 0,
    "rate_limited":         0,
    "latency_sum":          0.0,
    "latency_count":        0,
}
_metrics_lock = threading.Lock()

def record_metric(key: str, value: float = 1):
    with _metrics_lock:
        if key in ("latency_sum",):
            _metrics[key] += value
        elif key in ("latency_count",):
            _metrics[key] += 1
        else:
            _metrics[key] = _metrics.get(key, 0) + value

def get_metrics() -> dict:
    with _metrics_lock:
        m = dict(_metrics)
    avg_latency = m["latency_sum"] / m["latency_count"] if m["latency_count"] else 0
    return {
        **m,
        "latency_avg": round(avg_latency, 3),
    }

# ── Rate limiting (rol bazlı) ─────────────────────────────────────────────────
ROLE_RATE_LIMITS = {"ADMIN": 30, "CORPORATE": 20, "INDIVIDUAL": 10}  # istek/dakika
_rl_store: dict[str, list[float]] = defaultdict(list)
_rl_lock = threading.Lock()

def check_rate_limit(ip: str, role: str) -> bool:
    limit = ROLE_RATE_LIMITS.get(role, 10)
    key = f"{ip}:{role}"
    now = time.time()
    with _rl_lock:
        _rl_store[key] = [t for t in _rl_store[key] if now - t < 60]
        if len(_rl_store[key]) >= limit:
            return False
        _rl_store[key].append(now)
        return True

def parse_lang(accept_language: str) -> str:
    """Accept-Language başlığından birincil dili çıkarır → 'TR' veya 'EN'."""
    if not accept_language:
        return "EN"
    primary = accept_language.split(",")[0].split(";")[0].split("-")[0].lower()
    return "TR" if primary == "tr" else "EN"

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Statik dosyalar (UI)
_static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=_static_dir), name="static")

VALID_ROLES = {"ADMIN", "CORPORATE", "INDIVIDUAL"}
MAX_QUESTION_LENGTH = 500

INJECTION_PATTERNS = [
    r"['\"];?\s*(DROP|DELETE|INSERT|UPDATE|ALTER|TRUNCATE)",
    r"--\s*$",
    r"/\*.*?\*/",
    r";\s*(SELECT|DROP|DELETE|INSERT|UPDATE)",
    r"UNION\s+SELECT",
    r"OR\s+1\s*=\s*1",
    r"AND\s+1\s*=\s*1",
]

def normalize_text(text: str) -> str:
    # unicode full-width ve özel karakterleri normalize et
    return unicodedata.normalize("NFKC", text)

def has_sql_pattern(text: str) -> bool:
    text_upper = text.upper()
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, text_upper):
            return True
    return False

def greeting_response(text: str, lang: str) -> Optional[str]:
    normalized = normalize_text(text).strip().lower()
    normalized = re.sub(r"[^\w\sçğıöşüÇĞİÖŞÜ]", "", normalized)
    if normalized in {"selam", "merhaba", "mrb", "sa", "hello", "hi", "hey"}:
        return (
            "Merhaba! Lorrie hakkında ürünler, siparişler, mağaza performansı veya genel alışveriş konularında yardımcı olabilirim."
            if lang == "TR" else
            "Hello! I can help with Lorrie products, orders, store performance, or general shopping questions."
        )
    return None

def add_response_delay(start_time: float):
    # timing attack'ı önlemek için sabit yanıt süresi
    elapsed = time.time() - start_time
    min_response_time = 0.5
    if elapsed < min_response_time:
        time.sleep(min_response_time - elapsed)

class ChatRequest(BaseModel):
    question: str
    user_role: str = "INDIVIDUAL"
    is_logged_in: bool = False
    user_id: Optional[int] = None
    store_id: Optional[int] = None
    history: Optional[list[dict]] = None  # [{"role": "user"|"assistant", "content": str}, ...]

class ChatResponse(BaseModel):
    answer: str
    visualization_code: Union[str, None] = None
    sql_query: Union[str, None] = None
    guardrail_event: Union[dict, None] = None
    execution_meta: Union[dict, None] = None

@app.post("/chat", response_model=ChatResponse)
async def chat(request: Request, body: ChatRequest):
    start_time = time.time()
    ip   = get_remote_address(request)
    role = body.user_role.upper()
    lang = parse_lang(request.headers.get("accept-language", ""))

    logger.info("REQUEST | ip=%s role=%s lang=%s question=%.80r",
                ip, role, lang, body.question)

    record_metric("requests_total")
    error_occurred = False

    # boş soru kontrolü
    if not body.question or not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # normalize et (encoding bypass önlemi)
    normalized_question = normalize_text(body.question.strip())

    # uzun soru kontrolü
    if len(normalized_question) > MAX_QUESTION_LENGTH:
        raise HTTPException(status_code=400,
                            detail=f"Question too long. Max {MAX_QUESTION_LENGTH} characters.")

    # geçersiz rol kontrolü
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400,
                            detail=f"Invalid role. Must be one of: {VALID_ROLES}")

    # rol bazlı rate limit kontrolü
    if not check_rate_limit(ip, role):
        logger.warning("RATE_LIMIT | ip=%s role=%s", ip, role)
        record_metric("rate_limited")
        raise HTTPException(status_code=429,
                            detail="Too many requests. Please wait a moment." if lang == "EN"
                                   else "Çok fazla istek gönderildi. Lütfen bekleyin.")

    if greeting := greeting_response(normalized_question, lang):
        add_response_delay(start_time)
        record_metric("requests_success")
        return ChatResponse(answer=greeting, visualization_code=None, sql_query=None)

    # INDIVIDUAL/CORPORATE için ID yoksa genel cevap döner, hata fırlatılmaz

    # SQL pattern kontrolü (context stuffing önlemi)
    if has_sql_pattern(normalized_question):
        add_response_delay(start_time)
        logger.warning("SQL_INJECTION | ip=%s question=%.80r", ip, normalized_question)
        answer = (
            "Geçersiz bir istek tespit edildi. Lütfen e-ticaret verileriyle ilgili bir soru sorun."
            if lang == "TR" else
            "I detected an invalid request. Please ask a legitimate e-commerce data question."
        )
        return ChatResponse(answer=answer, visualization_code=None)

    GRAPH_TIMEOUT = int(os.getenv("GRAPH_TIMEOUT_SECONDS", "45"))

    # Sanitize history: keep only user turns, drop injected assistant turns,
    # truncate to 10, and filter out any entry that contains injection patterns.
    safe_history = None
    if body.history:
        safe_history = []
        for entry in body.history[-10:]:
            if not isinstance(entry, dict):
                continue
            entry_role = entry.get("role", "")
            content = entry.get("content", "")
            if not isinstance(content, str):
                continue
            # Only accept genuine user turns; never trust client-supplied assistant turns
            if entry_role != "user":
                continue
            # Reject history entries that contain injection patterns
            if has_sql_pattern(content):
                logger.warning("HISTORY_INJECTION | ip=%s content=%.80r", ip, content)
                continue
            normalized_content = normalize_text(content.strip())[:MAX_QUESTION_LENGTH]
            safe_history.append({"role": "user", "content": normalized_content})

    def _invoke():
        return graph_app.invoke({
            "question": normalized_question,
            "user_role": role,
            "is_logged_in": body.is_logged_in,
            "user_id": body.user_id,
            "store_id": body.store_id,
            "sql_query": None,
            "query_result": None,
            "error": None,
            "final_answer": None,
            "visualization_code": None,
            "is_in_scope": None,
            "iteration_count": 0,
            "lang": lang,
            "guardrail_event": None,
            "execution_meta": None,
            "history": safe_history,
        })

    executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    future = executor.submit(_invoke)
    try:
        try:
            result = future.result(timeout=GRAPH_TIMEOUT)
        except concurrent.futures.TimeoutError:
            future.cancel()
            error_occurred = True
            record_metric("requests_error")
            timeout_msg = (
                "İsteğiniz zaman aşımına uğradı. Lütfen daha kısa veya daha net bir soru sormayı deneyin."
                if lang == "TR" else
                "Your request timed out. Please try asking a shorter or simpler question."
            )
            raise HTTPException(status_code=504, detail=timeout_msg)
    except HTTPException:
        raise
    except Exception as ex:
        error_occurred = True
        record_metric("requests_error")
        logger.exception("CHAT_ERROR | role=%s question=%.80r", role, normalized_question)
        detail = (
            "Sohbet işlenirken bir hata oluştu. OpenRouter anahtarı ve Spring Boot (8080) "
            "erişimini kontrol edin; terminalde chatbot loglarına bakın."
            if lang == "TR" else
            "An error occurred while processing your chat. Check OpenRouter API key, "
            "Spring Boot (8080), and chatbot logs."
        )
        raise HTTPException(status_code=500, detail=detail) from ex
    finally:
        executor.shutdown(wait=False, cancel_futures=True)

    elapsed = time.time() - start_time
    record_metric("latency_sum", elapsed)
    record_metric("latency_count")
    if result.get("guardrail_event"):
        record_metric("guardrails_triggered")
    if not error_occurred:
        record_metric("requests_success")

    add_response_delay(start_time)
    logger.info("RESPONSE | ip=%s role=%s in_scope=%s elapsed=%.2fs",
                ip, role, result.get("is_in_scope"), elapsed)

    return ChatResponse(
        answer=result.get("final_answer", "No answer generated."),
        visualization_code=result.get("visualization_code"),
        sql_query=result.get("sql_query") if role == "ADMIN" else None,
        guardrail_event=result.get("guardrail_event"),
        execution_meta=result.get("execution_meta"),
    )


@app.get("/")
async def root():
    return FileResponse(os.path.join(_static_dir, "index.html"))

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/metrics")
async def metrics():
    return get_metrics()