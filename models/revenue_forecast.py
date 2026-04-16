import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
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

        # Feature mới theo logic ngày
        self.feature_columns = [
            'year', 'month', 'day', 'dayofweek',
            'is_weekend', 'is_month_end',
            'day_type_code',
            'party_size_avg', 'order_count',
            'avg_revenue_by_dow',      # trung bình doanh thu theo thứ
            'avg_revenue_by_day_type'  # trung bình doanh thu theo loại ngày
        ]

        # Lưu stats để predict
        self.dow_stats = {}
        self.day_type_stats = {}
        self.global_party_size_avg = 2.5
        self.global_order_count = 1
        self.global_avg_revenue = 0

    # =========================
    # 1. PHÂN LOẠI NGÀY (theo rule bạn đưa)
    # =========================
    def _get_day_type(self, date: pd.Timestamp):
        dow = date.dayofweek  # Monday=0
        day = date.day
        if dow in [0, 1]:  # Thứ 2,3
            return 'low'
        if dow in [4, 5] and day >= 25:  # Thứ 6,7 cuối tháng
            return 'high_peak'
        if dow in [4, 5] or day >= 25:  # Thứ 6,7 hoặc cuối tháng
            return 'peak'
        if dow in [2, 3] or (dow == 6 and day < 25):
            return 'medium'
        return 'medium'

    def _day_type_code(self, day_type: str):
        mapping = {'low': 0, 'medium': 1, 'peak': 2, 'high_peak': 3}
        return mapping.get(day_type, 1)

    # =========================
    # 2. FEATURE ENGINEERING
    # =========================
    def prepare_features(self, df):
        df['order_date'] = pd.to_datetime(df['order_date'])

        # Tổng doanh thu theo ngày
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

        # Time feature cơ bản
        daily['year'] = daily['order_date'].dt.year
        daily['month'] = daily['order_date'].dt.month
        daily['day'] = daily['order_date'].dt.day
        daily['dayofweek'] = daily['order_date'].dt.dayofweek
        daily['is_weekend'] = (daily['dayofweek'] >= 5).astype(int)
        daily['is_month_end'] = (daily['day'] >= 25).astype(int)

        # Day type
        daily['day_type'] = daily['order_date'].apply(self._get_day_type)
        daily['day_type_code'] = daily['day_type'].apply(self._day_type_code)

        return daily

    # =========================
    # 3. TRAIN
    # =========================
    def train(self, df_orders):
        daily = self.prepare_features(df_orders)

        # thống kê theo thứ & loại ngày
        self.dow_stats = daily.groupby('dayofweek')['total_revenue'].mean().to_dict()
        self.day_type_stats = daily.groupby('day_type')['total_revenue'].mean().to_dict()
        self.global_avg_revenue = daily['total_revenue'].mean()

        self.global_party_size_avg = daily['party_size_avg'].mean()
        self.global_order_count = daily['order_count'].mean()

        # Feature thêm
        daily['avg_revenue_by_dow'] = daily['dayofweek'].map(self.dow_stats)
        daily['avg_revenue_by_day_type'] = daily['day_type'].map(self.day_type_stats)

        X = daily[self.feature_columns]
        y = daily['total_revenue']

        # Train RF
        self.model = RandomForestRegressor(
            n_estimators=300,
            max_depth=None,
            min_samples_leaf=2,
            random_state=42
        )
        self.model.fit(X, y)

        # evaluate
        y_pred = self.model.predict(X)
        mae = mean_absolute_error(y, y_pred)
        mse = mean_squared_error(y, y_pred)
        r2 = r2_score(y, y_pred)

        print(f"Model performance:")
        print(f"MAE: {mae:.2f}")
        print(f"RMSE: {np.sqrt(mse):.2f}")
        print(f"R2 Score: {r2:.4f}")

        return self.model

    # =========================
    # 4. PREDICT
    # =========================
    def predict(self, date: datetime):
        if self.model is None:
            raise Exception("Model chưa được train")

        dow = date.weekday()
        day_type = self._get_day_type(pd.Timestamp(date))
        avg_rev_dow = self.dow_stats.get(dow, self.global_avg_revenue)
        avg_rev_day_type = self.day_type_stats.get(day_type, self.global_avg_revenue)

        features = {
            'year': date.year,
            'month': date.month,
            'day': date.day,
            'dayofweek': dow,
            'is_weekend': 1 if dow >= 5 else 0,
            'is_month_end': 1 if date.day >= 25 else 0,
            'day_type_code': self._day_type_code(day_type),
            'party_size_avg': self.global_party_size_avg,
            'order_count': self.global_order_count,
            'avg_revenue_by_dow': avg_rev_dow,
            'avg_revenue_by_day_type': avg_rev_day_type
        }

        X_pred = pd.DataFrame([features])[self.feature_columns]
        pred = self.model.predict(X_pred)[0]
        return max(0, pred)

    # =========================
    # 5. SAVE / LOAD
    # =========================
    def save_model(self, filename='revenue_forecast.pkl'):
        if not os.path.exists(MODEL_PATH):
            os.makedirs(MODEL_PATH)

        payload = {
            'model': self.model,
            'dow_stats': self.dow_stats,
            'day_type_stats': self.day_type_stats,
            'global_party_size_avg': self.global_party_size_avg,
            'global_order_count': self.global_order_count,
            'global_avg_revenue': self.global_avg_revenue
        }

        joblib.dump(payload, os.path.join(MODEL_PATH, filename))
        print(f"Model saved to {MODEL_PATH}{filename}")

    def load_model(self, filename='revenue_forecast.pkl'):
        data = joblib.load(os.path.join(MODEL_PATH, filename))

        # backward compatible
        if isinstance(data, dict):
            self.model = data.get('model', None)
            self.dow_stats = data.get('dow_stats', {})
            self.day_type_stats = data.get('day_type_stats', {})
            self.global_party_size_avg = data.get('global_party_size_avg', 2.5)
            self.global_order_count = data.get('global_order_count', 1)
            self.global_avg_revenue = data.get('global_avg_revenue', 0)
        else:
            self.model = data

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