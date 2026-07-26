import os
from datetime import timedelta

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

from config import MODEL_PATH


class IngredientDemandModel:
    """Dự báo lượng dùng mỗi nguyên liệu theo ngày.

    Lượng dùng được suy ra từ các đơn hoàn tất và recipe, nên cùng đơn vị với
    QuantityNeeded/StockQuantity. Model dùng đặc trưng lịch và trung bình nhu
    cầu gần đây của từng nguyên liệu; khi dữ liệu ít vẫn có fallback an toàn.
    """
    feature_columns = ['ingredient_id', 'dayofweek', 'month', 'is_weekend', 'mean_7d', 'mean_28d']
    # Sau mỗi 30 ngày, ảnh hưởng của một quan sát lịch sử giảm còn một nửa.
    # Vẫn giữ lịch sử dài để model không mất hoàn toàn tính mùa vụ.
    recency_half_life_days = 30

    def __init__(self):
        self.model = None
        self.history = pd.DataFrame(columns=['usage_date', 'ingredient_id', 'qty_used'])
        self.global_mean = 0.0

    def _normalize_usage(self, usage):
        """Normalize and aggregate actual daily usage before it enters history."""
        required_columns = ['usage_date', 'ingredient_id', 'qty_used']
        if usage is None or usage.empty:
            return pd.DataFrame(columns=required_columns)
        if any(column not in usage.columns for column in required_columns):
            raise ValueError('Usage data must contain usage_date, ingredient_id, and qty_used.')

        normalized = usage[required_columns].copy()
        normalized['usage_date'] = pd.to_datetime(normalized['usage_date'], errors='coerce').dt.normalize()
        normalized['ingredient_id'] = pd.to_numeric(normalized['ingredient_id'], errors='coerce')
        normalized['qty_used'] = pd.to_numeric(normalized['qty_used'], errors='coerce').fillna(0.0)
        normalized = normalized.dropna(subset=['usage_date', 'ingredient_id'])
        normalized['ingredient_id'] = normalized['ingredient_id'].astype(int)
        return normalized.groupby(['usage_date', 'ingredient_id'], as_index=False)['qty_used'].sum()

    def _calendarize(self, usage):
        usage = self._normalize_usage(usage)
        if usage.empty:
            return usage
        completed = []
        # Fill gaps only inside each ingredient's own observed range. Extending
        # a less recently sold ingredient to another ingredient's latest sale
        # would incorrectly create trailing zero-demand days.
        for ingredient_id, group in usage.groupby('ingredient_id', sort=False):
            dates = pd.date_range(group['usage_date'].min(), group['usage_date'].max(), freq='D')
            completed.append(pd.DataFrame({
                'usage_date': dates,
                'ingredient_id': int(ingredient_id)
            }))
        complete = pd.concat(completed, ignore_index=True)
        return complete.merge(usage, how='left', on=['usage_date', 'ingredient_id']).fillna({'qty_used': 0.0})

    def refresh(self, latest_usage):
        """Merge persisted history with new actual usage, then retrain the model.

        RandomForestRegressor has no safe incremental ``partial_fit`` API.  A refresh
        therefore preserves old history, lets current database rows replace matching
        dates, and trains a new forest from the combined series.
        """
        previous = self._normalize_usage(self.history)
        latest = self._normalize_usage(latest_usage)
        if previous.empty:
            combined = latest
        elif latest.empty:
            combined = previous
        else:
            previous['_source'] = 0
            latest['_source'] = 1
            combined = pd.concat([previous, latest], ignore_index=True)
            combined = combined.sort_values(['usage_date', 'ingredient_id', '_source'])
            combined = combined.drop_duplicates(['usage_date', 'ingredient_id'], keep='last')
            combined = combined.drop(columns='_source')
        self.train(combined)

    def _features(self, frame):
        df = frame.sort_values(['ingredient_id', 'usage_date']).copy()
        grouped = df.groupby('ingredient_id')['qty_used']
        # shift đảm bảo training không nhìn trước vào lượng dùng của chính ngày cần dự báo
        df['mean_7d'] = grouped.transform(lambda s: s.shift(1).rolling(7, min_periods=1).mean())
        df['mean_28d'] = grouped.transform(lambda s: s.shift(1).rolling(28, min_periods=1).mean())
        df['mean_7d'] = df['mean_7d'].fillna(0.0)
        df['mean_28d'] = df['mean_28d'].fillna(0.0)
        df['dayofweek'] = df['usage_date'].dt.dayofweek
        df['month'] = df['usage_date'].dt.month
        df['is_weekend'] = (df['dayofweek'] >= 5).astype(int)
        return df

    def train(self, usage):
        self.history = self._calendarize(usage)
        if self.history.empty:
            self.model = None
            self.global_mean = 0.0
            return
        feature_df = self._features(self.history)
        self.global_mean = float(feature_df['qty_used'].mean())
        # Ít hơn 30 observations không đủ để mô hình học ổn định; fallback moving average.
        if len(feature_df) < 30:
            self.model = None
            return
        self.model = RandomForestRegressor(n_estimators=250, min_samples_leaf=2, random_state=42, n_jobs=-1)
        newest_date = feature_df['usage_date'].max()
        age_in_days = (newest_date - feature_df['usage_date']).dt.days.clip(lower=0)
        recency_weights = np.power(0.5, age_in_days / self.recency_half_life_days)
        self.model.fit(
            feature_df[self.feature_columns],
            feature_df['qty_used'],
            sample_weight=recency_weights
        )

    def forecast(self, ingredient_id, days=14):
        days = max(1, min(int(days), 90))
        history = self.history[self.history['ingredient_id'] == ingredient_id].copy()
        if history.empty:
            return []
        rows = []
        current = history.sort_values('usage_date').copy()
        # A persisted model can be older than today, so avoid returning dates in
        # the past even when its latest observed item is older.
        next_date = max(
            current['usage_date'].max() + timedelta(days=1),
            pd.Timestamp.now().normalize() + timedelta(days=1)
        )
        for _ in range(days):
            last7 = float(current['qty_used'].tail(7).mean()) if len(current) else self.global_mean
            last28 = float(current['qty_used'].tail(28).mean()) if len(current) else self.global_mean
            features = pd.DataFrame([{
                'ingredient_id': ingredient_id, 'dayofweek': next_date.dayofweek,
                'month': next_date.month, 'is_weekend': int(next_date.dayofweek >= 5),
                'mean_7d': last7, 'mean_28d': last28
            }])[self.feature_columns]
            prediction = float(self.model.predict(features)[0]) if self.model is not None else last7
            prediction = max(0.0, prediction)
            rows.append({'date': next_date.date().isoformat(), 'ingredient_id': int(ingredient_id), 'predicted_qty_used': round(prediction, 4)})
            current = pd.concat([current, pd.DataFrame([{'usage_date': next_date, 'ingredient_id': ingredient_id, 'qty_used': prediction}])], ignore_index=True)
            next_date += timedelta(days=1)
        return rows

    def save_model(self, filename='ingredient_demand.pkl'):
        os.makedirs(MODEL_PATH, exist_ok=True)
        joblib.dump({'model': self.model, 'history': self.history, 'global_mean': self.global_mean}, os.path.join(MODEL_PATH, filename))

    def load_model(self, filename='ingredient_demand.pkl'):
        payload = joblib.load(os.path.join(MODEL_PATH, filename))
        self.model = payload.get('model')
        self.history = payload.get('history', self.history)
        self.global_mean = payload.get('global_mean', 0.0)
