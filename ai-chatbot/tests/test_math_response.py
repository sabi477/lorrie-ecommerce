import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ.setdefault("OPENROUTER_API_KEY", "test-key")

from main import math_response  # noqa: E402


class MathResponseTests(unittest.TestCase):
    def test_arithmetic_expression_explains_steps_in_turkish(self):
        answer = math_response("12 + 5 * 3 kaç eder?", "TR")

        self.assertIsNotNone(answer)
        self.assertIn("Sonuç: 27", answer)
        self.assertIn("5 × 3 = 15", answer)
        self.assertIn("12 + 15 = 27", answer)

    def test_turkish_operator_words(self):
        answer = math_response("20 bölü 4 artı 6", "TR")

        self.assertIsNotNone(answer)
        self.assertIn("Sonuç: 11", answer)
        self.assertIn("20 ÷ 4 = 5", answer)
        self.assertIn("5 + 6 = 11", answer)

    def test_percentage_expression_explains_formula(self):
        answer = math_response("1500 TL'nin yüzde 18'i kaç?", "TR")

        self.assertIsNotNone(answer)
        self.assertIn("Sonuç: 270", answer)
        self.assertIn("1500 × 18 / 100", answer)
        self.assertIn("27000 / 100 = 270", answer)

    def test_non_math_question_returns_none(self):
        self.assertIsNone(math_response("Son siparişlerimi göster", "TR"))


if __name__ == "__main__":
    unittest.main()
