import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ.setdefault("OPENROUTER_API_KEY", "test-key")

from agents.sql_agent import _extract_review_product_terms, _individual_quick_sql  # noqa: E402


class ReviewQuickSqlTests(unittest.TestCase):
    def test_extracts_multiple_product_names_with_turkish_suffixes(self):
        self.assertEqual(
            _extract_review_product_terms("kaç tane değerlendirmeleri var limon ve suyun"),
            ["limon", "su"],
        )

    def test_extracts_named_product_without_query_words(self):
        self.assertEqual(
            _extract_review_product_terms("Amazon Echo Plus ürününün kaç yorumu var ve yorumları özetle"),
            ["amazon echo plus"],
        )

    def test_named_product_review_sql_includes_count_average_and_samples(self):
        sql = _individual_quick_sql(
            "Amazon Echo Plus ürününün kaç yorumu var ve yorumları özetle",
            None,
        )

        self.assertIn("COUNT(r.id) AS review_count", sql)
        self.assertIn("ROUND(AVG(r.rating)::numeric, 2) AS average_rating", sql)
        self.assertIn("STRING_AGG", sql)
        self.assertIn("p.name ILIKE '%amazon echo plus%'", sql)

    def test_general_review_question_returns_all_products_summary_sql(self):
        sql = _individual_quick_sql("ürünlerin kaç değerlendirmesi olduğunu özetle", None)

        self.assertIn("FROM products p", sql)
        self.assertIn("LEFT JOIN reviews r ON r.product_id = p.id", sql)
        self.assertNotIn("WHERE p.name ILIKE", sql)
        self.assertIn("LIMIT 20", sql)


if __name__ == "__main__":
    unittest.main()
