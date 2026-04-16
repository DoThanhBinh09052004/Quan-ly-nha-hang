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

        self.feature_columns = [
            'year', 'month', 'day', 'dayofweek',
            'is_weekend', 'is_month_end',
            'day_type_code',
            'party_size_avg', 'order_count',
            'avg_revenue_by_dow', 'avg_order_count_by_dow', 'avg_party_size_by_dow',
            'avg_revenue_by_day_type', 'avg_order_count_by_day_type', 'avg_party_size_by_day_type',
            'lag_1', 'lag_7', 'lag_14', 'rolling_7', 'rolling_14'
        ]

        # Backward-compatible stats
        self.dow_stats = {}
        self.day_type_stats = {}
        self.dow_order_count_stats = {}
        self.dow_party_size_stats = {}
        self.day_type_order_count_stats = {}
        self.day_type_party_size_stats = {}
        self.global_party_size_avg = 2.5
        self.global_order_count = 1
        self.global_avg_revenue = 0
        self.history_daily = pd.DataFrame(columns=['order_date', 'total_revenue', 'party_size_avg', 'order_count'])
        self.last_actual_date = None

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
        df = df.copy()
        df['order_date'] = pd.to_datetime(df['order_date'])

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
        daily = daily.sort_values('order_date').reset_index(drop=True)

        daily['year'] = daily['order_date'].dt.year
        daily['month'] = daily['order_date'].dt.month
        daily['day'] = daily['order_date'].dt.day
        daily['dayofweek'] = daily['order_date'].dt.dayofweek
        daily['is_weekend'] = (daily['dayofweek'] >= 5).astype(int)
        daily['is_month_end'] = (daily['day'] >= 25).astype(int)

        daily['day_type'] = daily['order_date'].apply(self._get_day_type)
        daily['day_type_code'] = daily['day_type'].apply(self._day_type_code)

        return daily

    def _safe_mean(self, series, fallback):
        if len(series) == 0:
            return fallback
        return float(series.mean())

    def _apply_rule_aggregate_features(self, df):
        out = df.copy()
        out['avg_revenue_by_dow'] = out['dayofweek'].map(self.dow_stats).fillna(self.global_avg_revenue)
        out['avg_order_count_by_dow'] = out['dayofweek'].map(self.dow_order_count_stats).fillna(self.global_order_count)
        out['avg_party_size_by_dow'] = out['dayofweek'].map(self.dow_party_size_stats).fillna(self.global_party_size_avg)

        out['avg_revenue_by_day_type'] = out['day_type'].map(self.day_type_stats).fillna(self.global_avg_revenue)
        out['avg_order_count_by_day_type'] = out['day_type'].map(self.day_type_order_count_stats).fillna(self.global_order_count)
        out['avg_party_size_by_day_type'] = out['day_type'].map(self.day_type_party_size_stats).fillna(self.global_party_size_avg)
        return out

    def _apply_time_series_features(self, df):
        out = df.copy()
        revenue_shift = out['total_revenue'].shift(1)
        out['lag_1'] = revenue_shift
        out['lag_7'] = out['total_revenue'].shift(7)
        out['lag_14'] = out['total_revenue'].shift(14)
        out['rolling_7'] = revenue_shift.rolling(window=7, min_periods=1).mean()
        out['rolling_14'] = revenue_shift.rolling(window=14, min_periods=1).mean()
        return out

    def _finalize_feature_values(self, df):
        out = df.copy()
        out['party_size_avg'] = out['party_size_avg'].fillna(self.global_party_size_avg)
        out['order_count'] = out['order_count'].fillna(self.global_order_count)

        for col in ['lag_1', 'lag_7', 'lag_14', 'rolling_7', 'rolling_14']:
            out[col] = out[col].fillna(self.global_avg_revenue)

        for col in [
            'avg_revenue_by_dow', 'avg_order_count_by_dow', 'avg_party_size_by_dow',
            'avg_revenue_by_day_type', 'avg_order_count_by_day_type', 'avg_party_size_by_day_type'
        ]:
            if 'revenue' in col:
                out[col] = out[col].fillna(self.global_avg_revenue)
            elif 'order_count' in col:
                out[col] = out[col].fillna(self.global_order_count)
            else:
                out[col] = out[col].fillna(self.global_party_size_avg)
        return out

    def _estimate_order_count(self, day_type, dow):
        return float(
            self.day_type_order_count_stats.get(
                day_type,
                self.dow_order_count_stats.get(dow, self.global_order_count)
            )
        )

    def _estimate_party_size(self, day_type, dow):
        return float(
            self.day_type_party_size_stats.get(
                day_type,
                self.dow_party_size_stats.get(dow, self.global_party_size_avg)
            )
        )

    def _build_single_day_features(self, target_date: pd.Timestamp, history_df: pd.DataFrame):
        target_date = pd.Timestamp(target_date).normalize()
        history_df = history_df.copy().sort_values('order_date').reset_index(drop=True)
        history_before = history_df[history_df['order_date'] < target_date]
        revenue_history = history_before['total_revenue'].tolist()

        lag_1 = revenue_history[-1] if len(revenue_history) >= 1 else self.global_avg_revenue
        lag_7 = revenue_history[-7] if len(revenue_history) >= 7 else self.global_avg_revenue
        lag_14 = revenue_history[-14] if len(revenue_history) >= 14 else self.global_avg_revenue
        rolling_7 = float(np.mean(revenue_history[-7:])) if len(revenue_history) >= 1 else self.global_avg_revenue
        rolling_14 = float(np.mean(revenue_history[-14:])) if len(revenue_history) >= 1 else self.global_avg_revenue

        dow = target_date.dayofweek
        day_type = self._get_day_type(target_date)
        same_day_rows = history_df[history_df['order_date'] == target_date]
        if len(same_day_rows) > 0:
            party_size_avg = float(same_day_rows.iloc[0]['party_size_avg'])
            order_count = float(same_day_rows.iloc[0]['order_count'])
        else:
            party_size_avg = self._estimate_party_size(day_type, dow)
            order_count = self._estimate_order_count(day_type, dow)

        features = {
            'year': target_date.year,
            'month': target_date.month,
            'day': target_date.day,
            'dayofweek': dow,
            'is_weekend': 1 if dow >= 5 else 0,
            'is_month_end': 1 if target_date.day >= 25 else 0,
            'day_type_code': self._day_type_code(day_type),
            'party_size_avg': party_size_avg,
            'order_count': order_count,
            'avg_revenue_by_dow': self.dow_stats.get(dow, self.global_avg_revenue),
            'avg_order_count_by_dow': self.dow_order_count_stats.get(dow, self.global_order_count),
            'avg_party_size_by_dow': self.dow_party_size_stats.get(dow, self.global_party_size_avg),
            'avg_revenue_by_day_type': self.day_type_stats.get(day_type, self.global_avg_revenue),
            'avg_order_count_by_day_type': self.day_type_order_count_stats.get(day_type, self.global_order_count),
            'avg_party_size_by_day_type': self.day_type_party_size_stats.get(day_type, self.global_party_size_avg),
            'lag_1': lag_1,
            'lag_7': lag_7,
            'lag_14': lag_14,
            'rolling_7': rolling_7,
            'rolling_14': rolling_14
        }

        return pd.DataFrame([features])[self.feature_columns]

    # =========================
    # 3. TRAIN
    # =========================
    def train(self, df_orders):
        daily = self.prepare_features(df_orders)
        n_days = len(daily)
        if n_days < 2:
            raise ValueError("Không đủ dữ liệu để train revenue model (cần ít nhất 2 ngày).")

        split_idx = int(n_days * 0.8)
        split_idx = max(1, min(split_idx, n_days - 1))
        train_daily = daily.iloc[:split_idx].copy()

        # Compute rule-driven stats from train split only
        self.dow_stats = train_daily.groupby('dayofweek')['total_revenue'].mean().to_dict()
        self.day_type_stats = train_daily.groupby('day_type')['total_revenue'].mean().to_dict()
        self.dow_order_count_stats = train_daily.groupby('dayofweek')['order_count'].mean().to_dict()
        self.dow_party_size_stats = train_daily.groupby('dayofweek')['party_size_avg'].mean().to_dict()
        self.day_type_order_count_stats = train_daily.groupby('day_type')['order_count'].mean().to_dict()
        self.day_type_party_size_stats = train_daily.groupby('day_type')['party_size_avg'].mean().to_dict()

        self.global_avg_revenue = self._safe_mean(train_daily['total_revenue'], 0)
        self.global_party_size_avg = self._safe_mean(train_daily['party_size_avg'], 2.5)
        self.global_order_count = self._safe_mean(train_daily['order_count'], 1)

        daily = self._apply_rule_aggregate_features(daily)
        daily = self._apply_time_series_features(daily)
        daily = self._finalize_feature_values(daily)

        X_train = daily.iloc[:split_idx][self.feature_columns]
        y_train = daily.iloc[:split_idx]['total_revenue']
        X_test = daily.iloc[split_idx:][self.feature_columns]
        y_test = daily.iloc[split_idx:]['total_revenue']

        self.model = RandomForestRegressor(
            n_estimators=300,
            max_depth=None,
            min_samples_leaf=2,
            random_state=42
        )
        self.model.fit(X_train, y_train)

        y_pred = self.model.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)

        print("Model evaluation (time-ordered test split):")
        print(f"MAE (test): {mae:.2f}")
        print(f"RMSE (test): {np.sqrt(mse):.2f}")
        print(f"R2 (test): {r2:.4f}")

        self.history_daily = daily[['order_date', 'total_revenue', 'party_size_avg', 'order_count']].copy()
        self.history_daily['order_date'] = pd.to_datetime(self.history_daily['order_date'])
        self.history_daily = self.history_daily.sort_values('order_date').reset_index(drop=True)
        self.last_actual_date = self.history_daily['order_date'].max()

        return self.model

    # =========================
    # 4. PREDICT
    # =========================
    def predict(self, date: datetime):
        if self.model is None:
            raise Exception("Model chưa được train")
        target_date = pd.Timestamp(date).normalize()

        history = self.history_daily.copy()
        if history.empty:
            base_date = target_date - pd.Timedelta(days=1)
            history = pd.DataFrame([{
                'order_date': base_date,
                'total_revenue': self.global_avg_revenue,
                'party_size_avg': self.global_party_size_avg,
                'order_count': self.global_order_count
            }])
        history['order_date'] = pd.to_datetime(history['order_date'])
        history = history.sort_values('order_date').reset_index(drop=True)

        last_actual_date = pd.Timestamp(self.last_actual_date) if self.last_actual_date is not None else history['order_date'].max()

        if target_date <= last_actual_date:
            X_pred = self._build_single_day_features(target_date, history)
            pred = self.model.predict(X_pred)[0]
            return max(0, float(pred))

        forecast_history = history.copy()
        current_date = last_actual_date + pd.Timedelta(days=1)
        pred = 0.0

        while current_date <= target_date:
            X_future = self._build_single_day_features(current_date, forecast_history)
            pred = max(0, float(self.model.predict(X_future)[0]))

            day_type = self._get_day_type(current_date)
            dow = current_date.dayofweek
            future_row = pd.DataFrame([{
                'order_date': current_date,
                'total_revenue': pred,
                'party_size_avg': self._estimate_party_size(day_type, dow),
                'order_count': self._estimate_order_count(day_type, dow)
            }])
            forecast_history = pd.concat([forecast_history, future_row], ignore_index=True)
            forecast_history = forecast_history.sort_values('order_date').reset_index(drop=True)
            current_date += pd.Timedelta(days=1)

        return pred

    # =========================
    # 5. SAVE / LOAD
    # =========================
    def save_model(self, filename='revenue_forecast.pkl'):
        if not os.path.exists(MODEL_PATH):
            os.makedirs(MODEL_PATH)

        payload = {
            'model': self.model,
            'feature_columns': self.feature_columns,
            'dow_stats': self.dow_stats,
            'day_type_stats': self.day_type_stats,
            'dow_order_count_stats': self.dow_order_count_stats,
            'dow_party_size_stats': self.dow_party_size_stats,
            'day_type_order_count_stats': self.day_type_order_count_stats,
            'day_type_party_size_stats': self.day_type_party_size_stats,
            'global_party_size_avg': self.global_party_size_avg,
            'global_order_count': self.global_order_count,
            'global_avg_revenue': self.global_avg_revenue,
            'history_daily': self.history_daily,
            'last_actual_date': self.last_actual_date
        }

        joblib.dump(payload, os.path.join(MODEL_PATH, filename))
        print(f"Model saved to {MODEL_PATH}{filename}")

    def load_model(self, filename='revenue_forecast.pkl'):
        data = joblib.load(os.path.join(MODEL_PATH, filename))

        # backward compatible
        if isinstance(data, dict):
            self.model = data.get('model', None)
            self.feature_columns = data.get('feature_columns', self.feature_columns)
            self.dow_stats = data.get('dow_stats', {})
            self.day_type_stats = data.get('day_type_stats', {})
            self.dow_order_count_stats = data.get('dow_order_count_stats', {})
            self.dow_party_size_stats = data.get('dow_party_size_stats', {})
            self.day_type_order_count_stats = data.get('day_type_order_count_stats', {})
            self.day_type_party_size_stats = data.get('day_type_party_size_stats', {})
            self.global_party_size_avg = data.get('global_party_size_avg', 2.5)
            self.global_order_count = data.get('global_order_count', 1)
            self.global_avg_revenue = data.get('global_avg_revenue', 0)

            history_daily = data.get('history_daily', pd.DataFrame(columns=['order_date', 'total_revenue', 'party_size_avg', 'order_count']))
            if isinstance(history_daily, pd.DataFrame):
                self.history_daily = history_daily.copy()
            else:
                self.history_daily = pd.DataFrame(history_daily)

            if not self.history_daily.empty and 'order_date' in self.history_daily.columns:
                self.history_daily['order_date'] = pd.to_datetime(self.history_daily['order_date'])
                self.history_daily = self.history_daily.sort_values('order_date').reset_index(drop=True)
                self.last_actual_date = data.get('last_actual_date', self.history_daily['order_date'].max())
            else:
                self.history_daily = pd.DataFrame(columns=['order_date', 'total_revenue', 'party_size_avg', 'order_count'])
                self.last_actual_date = data.get('last_actual_date', None)
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
