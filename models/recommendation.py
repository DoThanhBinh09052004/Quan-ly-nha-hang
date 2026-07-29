"""Thuật toán market-basket recommendation, độc lập với DB và artifact storage."""

import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules


class RecommendationModel:
    """Sinh và tra cứu association rules đã được training pipeline cung cấp."""

    def __init__(self) -> None:
        self.rules = None
        self.item_names: dict[str, str] = {}

    @staticmethod
    def prepare_basket(items: pd.DataFrame) -> pd.DataFrame:
        """Biến order items thành ma trận boolean order × món."""
        basket = items.groupby(["OrderId", "item_name"])["Quantity"].sum().unstack().fillna(0)
        return basket.gt(0)

    def train(self, items: pd.DataFrame) -> dict[str, int]:
        """Train Apriori và rules; caller chịu trách nhiệm persist kết quả."""
        basket = self.prepare_basket(items)
        if basket.empty:
            raise ValueError("No order items are available for recommendation training.")
        frequent_itemsets = apriori(basket, min_support=0.1, use_colnames=True)
        if frequent_itemsets.empty:
            self.rules = pd.DataFrame()
        else:
            self.rules = association_rules(frequent_itemsets, metric="lift", min_threshold=1.2)
            self.rules = self.rules.sort_values(["confidence", "lift"], ascending=False)
        self.item_names = {name: name for name in basket.columns}
        return {"basket_count": int(len(basket)), "rule_count": int(len(self.rules))}

    def get_recommendations(self, items_list: list[str], top_n: int = 5) -> list[dict]:
        """Trả các món chưa có trong giỏ, sắp theo confidence và lift."""
        if self.rules is None:
            raise RuntimeError("Recommendation model is not loaded.")
        input_set, candidates = frozenset(items_list), []
        for _, rule in self.rules.iterrows():
            if input_set.issuperset(rule["antecedents"]):
                for item in rule["consequents"] - input_set:
                    candidates.append({"item": item, "confidence": rule["confidence"], "lift": rule["lift"], "support": rule["support"]})
        if not candidates:
            return []
        best = pd.DataFrame(candidates).groupby("item").agg({"confidence": "max", "lift": "max", "support": "max"}).reset_index()
        return best.sort_values(["confidence", "lift"], ascending=False).head(top_n).to_dict("records")
