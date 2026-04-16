import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import os
from datetime import datetime, timedelta
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from database import load_orders_data
from config import MODEL_PATH

class RevenueForecastModel:
    def __init__(self):
        self.model = None
        self.feature_columns = ['year', 'month', 'day', 'dayofweek', 'is_weekend', 'party_size_avg']
        
    def prepare_features(self, df):
        """Tạo features từ dữ liệu order"""
        # Lấy ngày từ order_date
        df['order_date'] = pd.to_datetime(df['order_date'])
        df['year'] = df['order_date'].dt.year
        df['month'] = df['order_date'].dt.month
        df['day'] = df['order_date'].dt.day
        df['dayofweek'] = df['order_date'].dt.dayofweek
        df['is_weekend'] = (df['dayofweek'] >= 5).astype(int)
        
        # Tính tổng doanh thu theo ngày
        daily = df.groupby(df['order_date'].dt.date).agg({
            'FinalPrice': 'sum',
            'PartySize': 'mean',
            'order_id': 'count'
        }).rename(columns={
            'FinalPrice': 'total_revenue',
            'PartySize': 'party_size_avg',
            'order_id': 'order_count'
        }).reset_index()
        daily['order_date'] = pd.to_datetime(daily['order_date'])
        
        # Thêm features thời gian
        daily['year'] = daily['order_date'].dt.year
        daily['month'] = daily['order_date'].dt.month
        daily['day'] = daily['order_date'].dt.day
        daily['dayofweek'] = daily['order_date'].dt.dayofweek
        daily['is_weekend'] = (daily['dayofweek'] >= 5).astype(int)
        
        return daily
    
    def train(self, df_orders):
        """Train model Random Forest"""
        daily = self.prepare_features(df_orders)
        
        # Features và target
        X = daily[self.feature_columns]
        y = daily['total_revenue']
        
        # Chia train/test
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Huấn luyện
        self.model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
        self.model.fit(X_train, y_train)
        
        # Đánh giá
        y_pred = self.model.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        print(f"Model performance:")
        print(f"MAE: {mae:.2f}")
        print(f"RMSE: {np.sqrt(mse):.2f}")
        print(f"R2 Score: {r2:.4f}")
        
        # Feature importance
        importances = self.model.feature_importances_
        for feat, imp in zip(self.feature_columns, importances):
            print(f"{feat}: {imp:.4f}")
        
        return self.model
    
    def predict(self, date):
        """Dự báo doanh thu cho một ngày cụ thể"""
        if self.model is None:
            raise Exception("Model chưa được train")
        
        # Tạo features cho ngày cần dự báo
        features = {
            'year': date.year,
            'month': date.month,
            'day': date.day,
            'dayofweek': date.weekday(),
            'is_weekend': 1 if date.weekday() >= 5 else 0,
            'party_size_avg': 2.5  # Giá trị mặc định, có thể lấy trung bình từ dữ liệu
        }
        X_pred = pd.DataFrame([features])[self.feature_columns]
        pred = self.model.predict(X_pred)[0]
        return max(0, pred)  # Doanh thu không âm
    
    def save_model(self, filename='revenue_forecast.pkl'):
        """Lưu model ra file"""
        if not os.path.exists(MODEL_PATH):
            os.makedirs(MODEL_PATH)
        joblib.dump(self.model, os.path.join(MODEL_PATH, filename))
        print(f"Model saved to {MODEL_PATH}{filename}")
    
    def load_model(self, filename='revenue_forecast.pkl'):
        """Load model từ file"""
        self.model = joblib.load(os.path.join(MODEL_PATH, filename))
        print(f"Model loaded from {MODEL_PATH}{filename}")

# Test nếu chạy trực tiếp
if __name__ == "__main__":
    df = load_orders_data()
    model = RevenueForecastModel()
    model.train(df)
    model.save_model()
    
    # Dự báo cho ngày mai
    tomorrow = datetime.now() + timedelta(days=1)
    pred = model.predict(tomorrow)
    print(f"Dự báo doanh thu ngày {tomorrow.date()}: {pred:.0f} VND")