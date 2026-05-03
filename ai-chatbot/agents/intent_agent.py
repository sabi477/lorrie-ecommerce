import json
import re
import logging
from typing import Optional
from llm import llm
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger("chatbot")

ALLOWED_ORDER_STATUSES = {"pending", "preparing", "shipped", "delivered", "cancelled"}
ALLOWED_SHIPMENT_STATUSES = {"preparing", "shipped", "delivered"}
ALLOWED_USER_ROLES = {"INDIVIDUAL", "CORPORATE", "ADMIN"}


def _allowed_operations(role: str) -> list:
    base = [
        "UPDATE_PRODUCT_PRICE",
        "UPDATE_PRODUCT_STOCK",
        "UPDATE_PRODUCT_DISCOUNT",
        "UPDATE_ORDER_STATUS",
        "UPDATE_SHIPMENT_STATUS",
    ]
    if role == "ADMIN":
        return base + ["INSERT_CATEGORY", "UPDATE_USER_ROLE"]
    return base


def intent_agent(state):
    question = state["question"]
    user_role = state.get("user_role", "INDIVIDUAL")
    user_id = state.get("user_id")
    store_id = state.get("store_id")
    lang = state.get("lang", "EN")
    tr = lang == "TR"

    allowed_ops = _allowed_operations(user_role)

    messages = [
        SystemMessage(content=f"""You are an intent extraction system for an e-commerce chatbot.
Extract the user's mutation intent and return ONLY valid JSON.

ROLE: {user_role}
ALLOWED OPERATIONS: {', '.join(allowed_ops)}

Return this JSON structure (use null for missing fields):
{{
  "operation": "<operation or null>",
  "product_id": <int or null>,
  "product_name": "<string or null>",
  "order_id": <int or null>,
  "target_user_id": <int or null>,
  "price": <float or null>,
  "stock": <int or null>,
  "discount": <float or null>,
  "status": "<string or null>",
  "tracking_number": "<string or null>",
  "category_name": "<string or null>",
  "category_description": "<string or null>",
  "user_role": "<string or null>"
}}

Allowed operations:
- UPDATE_PRODUCT_PRICE: change product price (needs product_id or product_name, price)
- UPDATE_PRODUCT_STOCK: change stock quantity (needs product_id or product_name, stock)
- UPDATE_PRODUCT_DISCOUNT: change discount % (needs product_id or product_name, discount 0-100)
- UPDATE_ORDER_STATUS: change order status (needs order_id, status: pending/preparing/shipped/delivered/cancelled)
- UPDATE_SHIPMENT_STATUS: change shipment status (needs order_id, status: preparing/shipped/delivered, optional tracking_number)
- INSERT_CATEGORY: add new category (needs category_name, optional category_description) [ADMIN only]
- UPDATE_USER_ROLE: change user role (needs target_user_id, user_role: INDIVIDUAL/CORPORATE/ADMIN) [ADMIN only]

Return ONLY valid JSON, no markdown or explanation."""),
        HumanMessage(content=question),
    ]

    try:
        response = llm.invoke(messages)
        content = response.content.strip()
        json_match = re.search(r"\{.*\}", content, re.DOTALL)
        if not json_match:
            raise ValueError("No JSON in response")
        extracted = json.loads(json_match.group())
    except Exception as e:
        logger.error("INTENT_EXTRACTION_ERROR | %s", e)
        answer = (
            "İsteğinizi anlayamadım. Lütfen daha açık belirtin. Örnek: 'Ürün #5 fiyatını 299 TL yap'"
            if tr else
            "I couldn't understand your request. Example: 'Set product #5 price to 299'"
        )
        return {**state, "final_answer": answer, "pending_mutation": None}

    operation = extracted.get("operation")

    if not operation or operation not in allowed_ops:
        answer = (
            "Bu işlemi gerçekleştiremiyorum. Desteklenen işlemler: fiyat/stok/indirim güncelleme, sipariş/kargo durumu güncelleme."
            if tr else
            "I cannot perform this operation. Supported: price/stock/discount update, order/shipment status update."
        )
        return {**state, "final_answer": answer, "pending_mutation": None}

    validation_error = _validate(operation, extracted, lang)
    if validation_error:
        return {**state, "final_answer": validation_error, "pending_mutation": None}

    pending = {
        "operation": operation,
        "user_role": user_role,
        "user_id": user_id,
        "store_id": store_id,
        **{k: v for k, v in extracted.items() if k != "operation" and v is not None},
    }

    confirm_msg = _confirm_message(operation, pending, lang)
    logger.info("INTENT_EXTRACTED | role=%s op=%s", user_role, operation)

    return {**state, "final_answer": confirm_msg, "pending_mutation": pending}


def _validate(operation: str, data: dict, lang: str) -> Optional[str]:
    tr = lang == "TR"

    if operation == "UPDATE_ORDER_STATUS":
        status = (data.get("status") or "").lower()
        if status not in ALLOWED_ORDER_STATUSES:
            return (
                f"Geçersiz sipariş durumu. Kabul edilen: {', '.join(sorted(ALLOWED_ORDER_STATUSES))}"
                if tr else
                f"Invalid order status. Accepted: {', '.join(sorted(ALLOWED_ORDER_STATUSES))}"
            )

    if operation == "UPDATE_SHIPMENT_STATUS":
        status = (data.get("status") or "").lower()
        if status not in ALLOWED_SHIPMENT_STATUSES:
            return (
                f"Geçersiz kargo durumu. Kabul edilen: {', '.join(sorted(ALLOWED_SHIPMENT_STATUSES))}"
                if tr else
                f"Invalid shipment status. Accepted: {', '.join(sorted(ALLOWED_SHIPMENT_STATUSES))}"
            )

    if operation == "UPDATE_USER_ROLE":
        role = (data.get("user_role") or "").upper()
        if role not in ALLOWED_USER_ROLES:
            return (
                f"Geçersiz kullanıcı rolü. Kabul edilen: {', '.join(sorted(ALLOWED_USER_ROLES))}"
                if tr else
                f"Invalid user role. Accepted: {', '.join(sorted(ALLOWED_USER_ROLES))}"
            )

    if operation == "UPDATE_PRODUCT_PRICE" and data.get("price") is not None:
        try:
            if float(data["price"]) < 0:
                return "Fiyat negatif olamaz." if tr else "Price cannot be negative."
        except (TypeError, ValueError):
            return "Geçersiz fiyat değeri." if tr else "Invalid price value."

    if operation == "UPDATE_PRODUCT_DISCOUNT" and data.get("discount") is not None:
        try:
            d = float(data["discount"])
            if not (0 <= d <= 100):
                return "İndirim 0-100 arasında olmalıdır." if tr else "Discount must be 0-100."
        except (TypeError, ValueError):
            return "Geçersiz indirim değeri." if tr else "Invalid discount value."

    if operation == "UPDATE_PRODUCT_STOCK" and data.get("stock") is not None:
        try:
            if int(data["stock"]) < 0:
                return "Stok negatif olamaz." if tr else "Stock cannot be negative."
        except (TypeError, ValueError):
            return "Geçersiz stok değeri." if tr else "Invalid stock value."

    return None


def _confirm_message(operation: str, pending: dict, lang: str) -> str:
    tr = lang == "TR"
    product_ref = f"#{pending.get('product_id')}" if pending.get("product_id") else f'"{pending.get("product_name")}"'

    summaries: dict[str, tuple[str, str]] = {
        "UPDATE_PRODUCT_PRICE": (
            f"Ürün {product_ref} fiyatı → **{pending.get('price')} TL**",
            f"Product {product_ref} price → **{pending.get('price')} TL**",
        ),
        "UPDATE_PRODUCT_STOCK": (
            f"Ürün {product_ref} stok → **{pending.get('stock')} adet**",
            f"Product {product_ref} stock → **{pending.get('stock')} units**",
        ),
        "UPDATE_PRODUCT_DISCOUNT": (
            f"Ürün {product_ref} indirim → **%{pending.get('discount')}**",
            f"Product {product_ref} discount → **{pending.get('discount')}%**",
        ),
        "UPDATE_ORDER_STATUS": (
            f"Sipariş #{pending.get('order_id')} durumu → **{pending.get('status')}**",
            f"Order #{pending.get('order_id')} status → **{pending.get('status')}**",
        ),
        "UPDATE_SHIPMENT_STATUS": (
            f"Kargo (Sipariş #{pending.get('order_id')}) → **{pending.get('status')}**"
            + (f", takip no: {pending.get('tracking_number')}" if pending.get("tracking_number") else ""),
            f"Shipment (Order #{pending.get('order_id')}) → **{pending.get('status')}**"
            + (f", tracking: {pending.get('tracking_number')}" if pending.get("tracking_number") else ""),
        ),
        "INSERT_CATEGORY": (
            f"Yeni kategori: **{pending.get('category_name')}**",
            f"New category: **{pending.get('category_name')}**",
        ),
        "UPDATE_USER_ROLE": (
            f"Kullanıcı #{pending.get('target_user_id')} rolü → **{pending.get('user_role')}**",
            f"User #{pending.get('target_user_id')} role → **{pending.get('user_role')}**",
        ),
    }

    desc_tr, desc_en = summaries.get(operation, ("İşlem", "Operation"))
    desc = desc_tr if tr else desc_en

    if tr:
        return (
            f"⚠️ **Onay Gerekiyor**\n\n"
            f"{desc}\n\n"
            f"Bu değişikliği uygulamak istiyor musunuz?\n"
            f"→ Onaylamak için **onayla** yazın\n"
            f"→ İptal etmek için **iptal** yazın"
        )
    return (
        f"⚠️ **Confirmation Required**\n\n"
        f"{desc}\n\n"
        f"Do you want to apply this change?\n"
        f"→ Type **confirm** to proceed\n"
        f"→ Type **cancel** to abort"
    )
