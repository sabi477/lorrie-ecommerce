#!/usr/bin/env python3
"""
ETL Script - E-Commerce Analytics Platform
Imports sample data from 6 Kaggle datasets into PostgreSQL.

Datasets:
  DS1: UCI Online Retail (data.csv)          → products, orders, order_items
  DS2: Customer Behavior (E-commerce...)     → users
  DS3: Shipping Data (Train.csv)             → shipments
  DS4: Amazon Sales (Amazon Sale Report.csv) → categories
  DS5: Pakistan E-Commerce                   → skipped (coverage by DS1)
  DS6: Amazon Reviews (amazon_reviews_1pct)  → reviews
"""

import psycopg2
import pandas as pd
import hashlib
import random
import re
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────────────
DB = dict(host="localhost", port=5432, dbname="ecommerce", user="admin", password="admin123")

DS_BASE = "/Users/celalokuducu/Projeler/monoko"
DS1 = f"{DS_BASE}/data.csv"
DS2 = f"{DS_BASE}/E-commerce Customer Behavior - Sheet1.csv"
DS3 = f"{DS_BASE}/shipping_data/Train.csv"
DS4 = f"{DS_BASE}/amazon_sales/Amazon Sale Report.csv"
DS6 = f"{DS_BASE}/amazon_reviews_1pct.csv"

# Row limits to keep the DB small
DS1_ROWS = 3000
DS4_ROWS = 2000
DS6_ROWS = 2000

DUMMY_PASSWORD = hashlib.sha256(b"Password123!").hexdigest()


def slugify_email(name: str, uid: int) -> str:
    clean = re.sub(r"[^a-z0-9]", ".", name.lower().strip())
    clean = re.sub(r"\.+", ".", clean).strip(".")
    return f"{clean}.{uid}@example.com"


def safe_decimal(val, default=0.0):
    try:
        v = float(val)
        return round(v, 2) if v >= 0 else default
    except (TypeError, ValueError):
        return default


def safe_int(val, default=0):
    try:
        return max(0, int(float(val)))
    except (TypeError, ValueError):
        return default


# ── Load & clean source data ──────────────────────────────────────────────────

print("Loading datasets...")

# DS1 – UCI Online Retail
ds1 = pd.read_csv(DS1, nrows=DS1_ROWS, encoding="latin1")
ds1 = ds1.dropna(subset=["StockCode", "Description", "UnitPrice"])
ds1 = ds1[ds1["Quantity"] > 0]          # remove returns
ds1 = ds1[ds1["UnitPrice"] > 0]         # remove free items
ds1["CustomerID"] = ds1["CustomerID"].fillna(0).astype(int)
ds1["InvoiceDate"] = pd.to_datetime(ds1["InvoiceDate"], errors="coerce")
ds1 = ds1.dropna(subset=["InvoiceDate"])

# DS2 – Customer Behavior (all 349 rows)
ds2 = pd.read_csv(DS2, encoding="utf-8")
ds2.columns = [c.strip() for c in ds2.columns]

# DS3 – Shipping Data (all 11K rows)
ds3 = pd.read_csv(DS3, nrows=10999, encoding="utf-8")

# DS4 – Amazon Sales (for categories)
ds4 = pd.read_csv(DS4, nrows=DS4_ROWS, encoding="utf-8")
ds4.columns = [c.strip() for c in ds4.columns]

# DS6 – Amazon Reviews (for reviews)
ds6 = pd.read_csv(DS6, nrows=DS6_ROWS, encoding="utf-8")

print(f"DS1: {len(ds1)} rows | DS2: {len(ds2)} rows | DS3: {len(ds3)} rows")
print(f"DS4: {len(ds4)} rows | DS6: {len(ds6)} rows")


# ── Connect ───────────────────────────────────────────────────────────────────

conn = psycopg2.connect(**DB)
cur = conn.cursor()
print("Connected to PostgreSQL.")


# ── Truncate all tables (safe for re-runs) ────────────────────────────────────

cur.execute("""
    TRUNCATE TABLE reviews, order_items, shipments, orders,
                   products, categories, users RESTART IDENTITY CASCADE;
""")
conn.commit()
print("Cleared existing data.")


# ── 1. USERS (from DS2) ───────────────────────────────────────────────────────

print("\nInserting users...")

system_users = [
    ("admin@lorrie.com",     "Admin User",      "ADMIN"),
    ("corp1@lorrie.com",     "Corp Manager",    "CORPORATE"),
    ("corp2@lorrie.com",     "Store Manager",   "CORPORATE"),
]

for email, name, role in system_users:
    cur.execute(
        "INSERT INTO users (email, password, full_name, role) VALUES (%s, %s, %s, %s)",
        (email, DUMMY_PASSWORD, name, role)
    )

# DS2 customers
ds2_id_to_user_id = {}
for _, row in ds2.iterrows():
    cid = int(row["Customer ID"])
    city = str(row.get("City", "")).strip() or "Unknown"
    email = slugify_email(city, cid)
    name  = f"Customer {cid}"
    cur.execute(
        "INSERT INTO users (email, password, full_name, role) VALUES (%s, %s, %s, %s) RETURNING id",
        (email, DUMMY_PASSWORD, name, "CUSTOMER")
    )
    db_id = cur.fetchone()[0]
    ds2_id_to_user_id[cid] = db_id

user_ids = list(ds2_id_to_user_id.values())
conn.commit()
print(f"  Inserted {3 + len(user_ids)} users.")


# ── 2. CATEGORIES (from DS4 + DS1 descriptions) ───────────────────────────────

print("\nInserting categories...")

cat_names = set()
if "Category" in ds4.columns:
    cat_names.update(ds4["Category"].dropna().unique().tolist())

# fallback from DS1 country groupings → generic e-commerce categories
fallback_cats = [
    "Home & Living", "Stationery", "Gifts & Novelty", "Toys", "Clothing",
    "Electronics", "Books", "Kitchen", "Garden", "Party Supplies"
]
cat_names.update(fallback_cats)
cat_names = sorted({c.strip() for c in cat_names if isinstance(c, str) and c.strip()})

cat_name_to_id = {}
for name in cat_names:
    cur.execute(
        "INSERT INTO categories (name) VALUES (%s) RETURNING id", (name,)
    )
    cat_name_to_id[name] = cur.fetchone()[0]

conn.commit()
print(f"  Inserted {len(cat_name_to_id)} categories.")


# ── 3. PRODUCTS (from DS1 unique StockCodes) ─────────────────────────────────

print("\nInserting products...")

# corporate seller = user id 4 (first corporate after 3 system users)
seller_id = 4

# map DS1 descriptions to a category
cat_list = list(cat_name_to_id.items())  # [(name, id), ...]

def guess_category(desc: str) -> int:
    desc_lower = desc.lower()
    for name, cid in cat_list:
        if any(kw in desc_lower for kw in name.lower().split()):
            return cid
    return random.choice(cat_list)[1]

unique_products = (
    ds1.groupby("StockCode")
       .first()
       .reset_index()[["StockCode", "Description", "UnitPrice"]]
       .drop_duplicates(subset="StockCode")
)

stock_to_product_id = {}
for _, row in unique_products.iterrows():
    code  = str(row["StockCode"]).strip()
    name  = str(row["Description"]).strip()[:255]
    price = safe_decimal(row["UnitPrice"])
    stock = random.randint(10, 200)
    cat   = guess_category(name)

    cur.execute(
        """INSERT INTO products (name, description, price, stock_quantity, category_id, seller_id)
           VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
        (name, f"SKU: {code}", price, stock, cat, seller_id)
    )
    stock_to_product_id[code] = cur.fetchone()[0]

conn.commit()
print(f"  Inserted {len(stock_to_product_id)} products.")


# ── 4. ORDERS + ORDER_ITEMS (from DS1) ───────────────────────────────────────

print("\nInserting orders and order_items...")

STATUS_MAP = {"Shipped": "SHIPPED", "Delivered": "DELIVERED",
              "Cancelled": "CANCELLED", "Pending": "PENDING"}

order_id_map = {}   # invoice_no → db order id

for invoice_no, group in ds1.groupby("InvoiceNo"):
    # pick a random customer user
    customer_db_id = random.choice(user_ids)
    created_at     = group["InvoiceDate"].iloc[0].to_pydatetime()
    total          = round(sum(
        safe_decimal(r["UnitPrice"]) * safe_int(r["Quantity"])
        for _, r in group.iterrows()
    ), 2)

    cur.execute(
        "INSERT INTO orders (customer_id, status, total_amount, created_at) VALUES (%s,%s,%s,%s) RETURNING id",
        (customer_db_id, "DELIVERED", total, created_at)
    )
    order_db_id = cur.fetchone()[0]
    order_id_map[invoice_no] = order_db_id

    for _, item in group.iterrows():
        code = str(item["StockCode"]).strip()
        pid  = stock_to_product_id.get(code)
        if pid is None:
            continue
        qty   = safe_int(item["Quantity"])
        price = safe_decimal(item["UnitPrice"])
        cur.execute(
            "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (%s,%s,%s,%s)",
            (order_db_id, pid, qty, price)
        )

conn.commit()
print(f"  Inserted {len(order_id_map)} orders with their items.")


# ── 5. SHIPMENTS (from DS3, linked to orders) ─────────────────────────────────

print("\nInserting shipments...")

SHIP_STATUS = {1: "DELIVERED", 0: "IN_TRANSIT"}
order_db_ids = list(order_id_map.values())

shipped_count = 0
for i, (_, row) in enumerate(ds3.iterrows()):
    if i >= len(order_db_ids):
        break
    order_db_id = order_db_ids[i]
    on_time     = safe_int(row.get("Reached.on.Time_Y.N", 1))
    status      = SHIP_STATUS.get(on_time, "DELIVERED")
    mode        = str(row.get("Mode_of_Shipment", "Ground")).strip()
    tracking    = f"TRK{10000 + i:06d}"

    cur.execute(
        """INSERT INTO shipments (order_id, tracking_number, status)
           VALUES (%s, %s, %s)""",
        (order_db_id, tracking, status)
    )
    shipped_count += 1

conn.commit()
print(f"  Inserted {shipped_count} shipments.")


# ── 6. REVIEWS (from DS6) ────────────────────────────────────────────────────

print("\nInserting reviews...")

product_ids = list(stock_to_product_id.values())

review_count = 0
for _, row in ds6.iterrows():
    rating  = safe_int(row.get("star_rating", 3), default=3)
    rating  = max(1, min(5, rating))
    comment = str(row.get("review_body", "")).strip()[:1000] or None
    pid     = random.choice(product_ids)
    cid     = random.choice(user_ids)

    cur.execute(
        "INSERT INTO reviews (product_id, customer_id, rating, comment) VALUES (%s,%s,%s,%s)",
        (pid, cid, rating, comment)
    )
    review_count += 1

conn.commit()
print(f"  Inserted {review_count} reviews.")


# ── Summary ───────────────────────────────────────────────────────────────────

print("\n── Import complete ──────────────────────────────────────────────────────")
for table in ["users", "categories", "products", "orders", "order_items", "shipments", "reviews"]:
    cur.execute(f"SELECT COUNT(*) FROM {table}")
    n = cur.fetchone()[0]
    print(f"  {table:<15} {n:>6} rows")

cur.close()
conn.close()
