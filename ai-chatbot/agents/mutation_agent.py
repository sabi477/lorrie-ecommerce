import requests
import os
import time
import logging

logger = logging.getLogger("chatbot")

SPRING_BOOT_URL = os.getenv("SPRING_BOOT_URL", "http://localhost:8080")

_SUCCESS = {
    "UPDATE_PRODUCT_PRICE":    ("✅ Fiyat başarıyla güncellendi.",            "✅ Price updated successfully."),
    "UPDATE_PRODUCT_STOCK":    ("✅ Stok miktarı başarıyla güncellendi.",      "✅ Stock updated successfully."),
    "UPDATE_PRODUCT_DISCOUNT": ("✅ İndirim oranı başarıyla güncellendi.",     "✅ Discount updated successfully."),
    "UPDATE_ORDER_STATUS":     ("✅ Sipariş durumu başarıyla güncellendi.",     "✅ Order status updated successfully."),
    "UPDATE_SHIPMENT_STATUS":  ("✅ Kargo durumu başarıyla güncellendi.",       "✅ Shipment status updated successfully."),
    "INSERT_CATEGORY":         ("✅ Yeni kategori başarıyla eklendi.",          "✅ New category added successfully."),
    "UPDATE_USER_ROLE":        ("✅ Kullanıcı rolü başarıyla güncellendi.",     "✅ User role updated successfully."),
}


def mutation_agent(state):
    pending = state.get("pending_mutation")
    lang = state.get("lang", "EN")
    tr = lang == "TR"

    if not pending:
        answer = "Bekleyen bir işlem bulunamadı." if tr else "No pending operation found."
        return {**state, "final_answer": answer, "pending_mutation": None}

    operation = pending.get("operation")
    user_role = pending.get("user_role", "INDIVIDUAL")
    store_id = pending.get("store_id")

    try:
        sql = _build_sql(operation, pending, user_role, store_id, lang)
    except ValueError as e:
        logger.error("MUTATION_BUILD_ERROR | op=%s err=%s", operation, e)
        return {**state, "final_answer": str(e), "pending_mutation": None}

    logger.info("MUTATION_EXECUTE | role=%s op=%s sql=%.120r", user_role, operation, sql)

    try:
        start = time.time()
        resp = requests.post(
            f"{SPRING_BOOT_URL}/api/chat/mutate",
            json={"query": sql},
            timeout=20,
        )
        elapsed = round(time.time() - start, 2)

        if resp.status_code == 200:
            result = resp.json()
            rows = len(result) if isinstance(result, list) else 1
            logger.info("MUTATION_SUCCESS | op=%s rows=%d elapsed=%.2fs", operation, rows, elapsed)

            if rows == 0:
                answer = (
                    "⚠️ Eşleşen kayıt bulunamadı — değişiklik yapılmadı. ID'yi veya mağaza yetkisini kontrol edin."
                    if tr else
                    "⚠️ No matching record — no changes made. Please verify the ID and your store ownership."
                )
            else:
                msg_tr, msg_en = _SUCCESS.get(operation, ("✅ İşlem tamamlandı.", "✅ Operation completed."))
                answer = msg_tr if tr else msg_en

            return {
                **state,
                "final_answer": answer,
                "pending_mutation": None,
                "query_result": result,
                "execution_meta": {"row_count": rows, "elapsed_time": elapsed},
            }

        try:
            err_msg = resp.json().get("error", resp.text)
        except Exception:
            err_msg = resp.text
        logger.error("MUTATION_HTTP_ERROR | op=%s status=%d err=%s", operation, resp.status_code, err_msg)
        answer = (f"İşlem başarısız: {err_msg}" if tr else f"Operation failed: {err_msg}")
        return {**state, "final_answer": answer, "pending_mutation": None}

    except Exception:
        logger.exception("MUTATION_EXCEPTION | op=%s", operation)
        answer = (
            "İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin."
            if tr else
            "An error occurred during the operation. Please try again."
        )
        return {**state, "final_answer": answer, "pending_mutation": None}


def _require(data: dict, field: str, msg_tr: str, msg_en: str, lang: str):
    val = data.get(field)
    if val is None:
        raise ValueError(msg_tr if lang == "TR" else msg_en)
    return val


def _seller_product_filter(user_role: str, store_id) -> str:
    if user_role == "CORPORATE" and store_id is not None:
        return f" AND seller_id = {int(store_id)}"
    return ""


def _seller_order_filter(user_role: str, store_id) -> str:
    if user_role == "CORPORATE" and store_id is not None:
        sid = int(store_id)
        return (
            f" AND id IN ("
            f"SELECT order_id FROM order_items oi "
            f"JOIN products p ON oi.product_id = p.id "
            f"WHERE p.seller_id = {sid})"
        )
    return ""


def _seller_shipment_filter(user_role: str, store_id) -> str:
    if user_role == "CORPORATE" and store_id is not None:
        sid = int(store_id)
        return (
            f" AND order_id IN ("
            f"SELECT order_id FROM order_items oi "
            f"JOIN products p ON oi.product_id = p.id "
            f"WHERE p.seller_id = {sid})"
        )
    return ""


def _build_sql(operation: str, pending: dict, user_role: str, store_id, lang: str) -> str:
    tr = lang == "TR"

    def req(field, msg_tr, msg_en):
        return _require(pending, field, msg_tr, msg_en, lang)

    if operation == "UPDATE_PRODUCT_PRICE":
        price = req("price", "Fiyat belirtilmedi.", "Price not specified.")
        seller_f = _seller_product_filter(user_role, store_id)
        if pending.get("product_id"):
            return f"UPDATE products SET price = {float(price)} WHERE id = {int(pending['product_id'])}{seller_f} RETURNING id, name, price;"
        name = req("product_name", "Ürün ID veya adı belirtilmedi.", "Product ID or name not specified.")
        safe = str(name).replace("'", "''")
        return f"UPDATE products SET price = {float(price)} WHERE LOWER(name) = LOWER('{safe}'){seller_f} RETURNING id, name, price;"

    if operation == "UPDATE_PRODUCT_STOCK":
        stock = req("stock", "Stok miktarı belirtilmedi.", "Stock not specified.")
        seller_f = _seller_product_filter(user_role, store_id)
        if pending.get("product_id"):
            return f"UPDATE products SET stock_quantity = {int(stock)} WHERE id = {int(pending['product_id'])}{seller_f} RETURNING id, name, stock_quantity;"
        name = req("product_name", "Ürün ID veya adı belirtilmedi.", "Product ID or name not specified.")
        safe = str(name).replace("'", "''")
        return f"UPDATE products SET stock_quantity = {int(stock)} WHERE LOWER(name) = LOWER('{safe}'){seller_f} RETURNING id, name, stock_quantity;"

    if operation == "UPDATE_PRODUCT_DISCOUNT":
        discount = req("discount", "İndirim oranı belirtilmedi.", "Discount not specified.")
        seller_f = _seller_product_filter(user_role, store_id)
        if pending.get("product_id"):
            return f"UPDATE products SET discount_percentage = {float(discount)} WHERE id = {int(pending['product_id'])}{seller_f} RETURNING id, name, discount_percentage;"
        name = req("product_name", "Ürün ID veya adı belirtilmedi.", "Product ID or name not specified.")
        safe = str(name).replace("'", "''")
        return f"UPDATE products SET discount_percentage = {float(discount)} WHERE LOWER(name) = LOWER('{safe}'){seller_f} RETURNING id, name, discount_percentage;"

    if operation == "UPDATE_ORDER_STATUS":
        order_id = req("order_id", "Sipariş ID belirtilmedi.", "Order ID not specified.")
        status = req("status", "Sipariş durumu belirtilmedi.", "Order status not specified.")
        safe_status = str(status).replace("'", "''").lower()
        seller_f = _seller_order_filter(user_role, store_id)
        return f"UPDATE orders SET status = '{safe_status}' WHERE id = {int(order_id)}{seller_f} RETURNING id, status;"

    if operation == "UPDATE_SHIPMENT_STATUS":
        order_id = req("order_id", "Sipariş ID belirtilmedi.", "Order ID not specified.")
        status = req("status", "Kargo durumu belirtilmedi.", "Shipment status not specified.")
        safe_status = str(status).replace("'", "''").lower()
        tracking = pending.get("tracking_number")
        tracking_set = f", tracking_number = '{str(tracking).replace(chr(39), chr(39)*2)}'" if tracking else ""
        seller_f = _seller_shipment_filter(user_role, store_id)
        return f"UPDATE shipments SET status = '{safe_status}'{tracking_set} WHERE order_id = {int(order_id)}{seller_f} RETURNING id, order_id, status;"

    if operation == "INSERT_CATEGORY":
        if user_role != "ADMIN":
            raise ValueError(
                "Bu işlem için admin yetkisi gereklidir." if tr else "Admin permission required."
            )
        name = req("category_name", "Kategori adı belirtilmedi.", "Category name not specified.")
        desc = pending.get("category_description", "")
        safe_name = str(name).replace("'", "''")
        safe_desc = str(desc).replace("'", "''")
        return f"INSERT INTO categories (name, description) VALUES ('{safe_name}', '{safe_desc}') RETURNING id, name, description;"

    if operation == "UPDATE_USER_ROLE":
        if user_role != "ADMIN":
            raise ValueError(
                "Bu işlem için admin yetkisi gereklidir." if tr else "Admin permission required."
            )
        target_id = req("target_user_id", "Kullanıcı ID belirtilmedi.", "User ID not specified.")
        new_role = req("user_role", "Yeni rol belirtilmedi.", "New role not specified.")
        safe_role = str(new_role).replace("'", "''").upper()
        return f"UPDATE users SET role = '{safe_role}' WHERE id = {int(target_id)} RETURNING id, email, role;"

    raise ValueError(f"Bilinmeyen işlem: {operation}" if tr else f"Unknown operation: {operation}")
