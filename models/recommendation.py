import pandas as pd
import numpy as np
from mlxtend.frequent_patterns import apriori, association_rules
import joblib
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from database import load_order_items
from config import MODEL_PATH

class RecommendationModel:
    def __init__(self):
        self.rules = None
        self.item_names = {}
        
    def prepare_basket(self, df_items):
        """Chuẩn bị dữ liệu dạng basket cho Apriori"""
        # Gom các item theo từng order
        basket = df_items.groupby(['OrderId', 'item_name'])['Quantity'].sum().unstack().fillna(0)
        # Chuyển về dạng True/False (>=1)
        basket_sets = basket.map(lambda x: 1 if x > 0 else 0)
        return basket_sets.astype(bool)
    
    def train(self, df_items):
        """Train Apriori và sinh rules"""
        basket = self.prepare_basket(df_items)
        
        # Tìm frequent itemsets
        frequent_itemsets = apriori(basket, min_support=0.1, use_colnames=True)
        print(f"Found {len(frequent_itemsets)} frequent itemsets")
        
        # Sinh association rules
        self.rules = association_rules(frequent_itemsets, metric="lift", min_threshold=1.2)
        # Sắp xếp theo confidence và lift
        self.rules = self.rules.sort_values(['confidence', 'lift'], ascending=False)
        print(f"Generated {len(self.rules)} rules")
        
        # Lưu tên item để tra cứu
        self.item_names = {name: name for name in basket.columns}
        
        return self.rules
    
    def get_recommendations(self, items_list, top_n=5):
        """
        Gợi ý các món dựa trên danh sách món đã có
        items_list: list tên món (ví dụ: ['Phở bò', 'Bia'])
        """
        if self.rules is None:
            raise Exception("Model chưa được train")
        
        # Chuyển items_list thành frozenset để so khớp với antecedents
        input_set = frozenset(items_list)
        candidates = []
        
        for _, rule in self.rules.iterrows():
            antecedents = rule['antecedents']
            if input_set.issuperset(antecedents):
                # Các món trong consequents chưa có trong input
                new_items = rule['consequents'] - input_set
                for item in new_items:
                    candidates.append({
                        'item': item,
                        'confidence': rule['confidence'],
                        'lift': rule['lift'],
                        'support': rule['support']
                    })
        
        # Loại bỏ trùng và sắp xếp
        df_candidates = pd.DataFrame(candidates)
        if len(df_candidates) == 0:
            return []
        
        # Gom nhóm theo item, lấy confidence cao nhất
        best = df_candidates.groupby('item').agg({
            'confidence': 'max',
            'lift': 'max',
            'support': 'max'
        }).reset_index()
        best = best.sort_values(['confidence', 'lift'], ascending=False).head(top_n)
        
        return best.to_dict('records')
    
    def save_model(self, filename='recommendation_rules.pkl'):
        """Lưu rules ra file"""
        if not os.path.exists(MODEL_PATH):
            os.makedirs(MODEL_PATH)
        joblib.dump(self.rules, os.path.join(MODEL_PATH, filename))
        print(f"Rules saved to {MODEL_PATH}{filename}")
    
    def load_model(self, filename='recommendation_rules.pkl'):
        """Load rules từ file"""
        self.rules = joblib.load(os.path.join(MODEL_PATH, filename))
        print(f"Rules loaded from {MODEL_PATH}{filename}")

# Test
if __name__ == "__main__":
    df_items = load_order_items()
    model = RecommendationModel()
    model.train(df_items)
    model.save_model()
    
    # Thử gợi ý
    recs = model.get_recommendations(['Cơm chiên'])
    print("Gợi ý cho món Cơm chiên:")
    for r in recs:
        print(f"- {r['item']} (confidence: {r['confidence']:.2f})")