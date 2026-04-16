# check_rules.py
import joblib
import os
from config import MODEL_PATH

rule_path = os.path.join(MODEL_PATH, 'recommendation_rules.pkl')
if os.path.exists(rule_path):
    rules = joblib.load(rule_path)
    print(f"✅ File rules tồn tại")
    print(f"Số lượng rules: {len(rules)}")
    if len(rules) > 0:
        print("\n📋 5 rules đầu tiên:")
        for i in range(min(5, len(rules))):
            rule = rules.iloc[i]
            print(f"  {set(rule['antecedents'])} → {set(rule['consequents'])}")
            print(f"    confidence: {rule['confidence']:.3f}, lift: {rule['lift']:.3f}")
    else:
        print("⚠️ Rules rỗng! Cần train lại model.")
else:
    print("❌ Không tìm thấy file rules!")