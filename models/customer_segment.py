import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import joblib
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from database import load_orders_data, load_guests_data
from config import MODEL_PATH

class CustomerSegmentModel:
    def __init__(self, n_clusters=4):
        self.n_clusters = n_clusters
        self.model = None
        self.scaler = None
        self.feature_columns = ['total_spent', 'order_count', 'avg_order_value', 'points', 'tenure_days']
        
    def prepare_features(self, df_orders, df_guests):
        """Tạo features cho từng khách hàng"""
        # Kiểm tra xem df_guests có cột Points không
        if 'Points' in df_guests.columns:
            df_guests = df_guests.rename(columns={'Points': 'points'})
        elif 'points' not in df_guests.columns:
            # Nếu không có cột points, tạo cột points với giá trị 0
            df_guests['points'] = 0
            print("Warning: 'points' column not found in guest table, using 0 as default")
        
        # Tính các chỉ số theo khách hàng
        guest_stats = df_orders.groupby('GuestId').agg({
            'FinalPrice': ['sum', 'mean', 'count'],
            'order_date': lambda x: (pd.Timestamp.now() - x.max()).days
        }).reset_index()
        guest_stats.columns = ['GuestId', 'total_spent', 'avg_order_value', 'order_count', 'recency']
        
        # Merge với thông tin guest
        df = pd.merge(guest_stats, df_guests, left_on='GuestId', right_on='guest_id', how='inner')
        
        # Tính tenure (số ngày từ khi tạo tài khoản)
        df['tenure_days'] = (pd.Timestamp.now() - pd.to_datetime(df['Created'])).dt.days
        
        # Đảm bảo cột points tồn tại
        if 'points' not in df.columns:
            df['points'] = 0
        
        # Chọn features
        features = df[['total_spent', 'order_count', 'avg_order_value', 'points', 'tenure_days']].fillna(0)
        
        return features, df
    
    def train(self, df_orders, df_guests):
        """Train K-Means clustering"""
        X, df_full = self.prepare_features(df_orders, df_guests)
        
        # Chuẩn hóa dữ liệu
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        # Huấn luyện K-Means
        self.model = KMeans(n_clusters=self.n_clusters, random_state=42, n_init=10)
        clusters = self.model.fit_predict(X_scaled)
        
        # Gán nhãn cluster vào dataframe
        df_full['cluster'] = clusters
        
        # In thông tin các cụm
        for i in range(self.n_clusters):
            cluster_data = df_full[df_full['cluster'] == i]
            print(f"\nCluster {i}: {len(cluster_data)} khách hàng")
            print(f"  Tổng chi tiêu TB: {cluster_data['total_spent'].mean():.0f}")
            print(f"  Số đơn TB: {cluster_data['order_count'].mean():.1f}")
            print(f"  Điểm TB: {cluster_data['points'].mean():.0f}")
        
        return df_full
    
    def predict(self, guest_features):
        """Dự đoán cụm cho khách hàng mới"""
        if self.model is None or self.scaler is None:
            raise Exception("Model chưa được train")
        X_scaled = self.scaler.transform([guest_features])
        return self.model.predict(X_scaled)[0]
    
    def save_model(self, filename='customer_segment.pkl'):
        """Lưu model và scaler"""
        if not os.path.exists(MODEL_PATH):
            os.makedirs(MODEL_PATH)
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler
        }, os.path.join(MODEL_PATH, filename))
        print(f"Model saved to {MODEL_PATH}{filename}")
    
    def load_model(self, filename='customer_segment.pkl'):
        """Load model và scaler"""
        data = joblib.load(os.path.join(MODEL_PATH, filename))
        self.model = data['model']
        self.scaler = data['scaler']
        print(f"Model loaded from {MODEL_PATH}{filename}")

# Test
if __name__ == "__main__":
    df_orders = load_orders_data()
    df_guests = load_guests_data()
    model = CustomerSegmentModel(n_clusters=4)
    df_result = model.train(df_orders, df_guests)
    model.save_model()