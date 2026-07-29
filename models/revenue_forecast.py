"""Thuật toán revenue forecast, không truy cập DB hay filesystem."""

from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


class RevenueForecastModel:
    """Giữ state đã train để pipeline inference dự báo doanh thu theo ngày."""

    feature_columns = [
        "year", "month", "day", "dayofweek", "is_weekend", "is_month_end",
        "day_type_code", "party_size_avg", "order_count", "avg_revenue_by_dow",
        "avg_revenue_by_day_type",
    ]

    def __init__(self) -> None:
        self.model = None
        self.dow_stats: dict = {}
        self.day_type_stats: dict = {}
        self.global_party_size_avg = 2.5
        self.global_order_count = 1
        self.global_avg_revenue = 0.0

    @staticmethod
    def _get_day_type(value: pd.Timestamp) -> str:
        """Phân loại ngày theo quy tắc kinh doanh hiện hữu."""
        dow, day = value.dayofweek, value.day
        if dow in [0, 1]:
            return "low"
        if dow in [4, 5] and day >= 25:
            return "high_peak"
        if dow in [4, 5] or day >= 25:
            return "peak"
        return "medium"

    @staticmethod
    def _day_type_code(day_type: str) -> int:
        return {"low": 0, "medium": 1, "peak": 2, "high_peak": 3}.get(day_type, 1)

    def prepare_features(self, orders: pd.DataFrame) -> pd.DataFrame:
        """Tổng hợp order hoàn tất thành một dòng training cho mỗi ngày."""
        frame = orders.copy()
        frame["order_date"] = pd.to_datetime(frame["order_date"])
        daily = frame.groupby(frame["order_date"].dt.date).agg(
            FinalPrice=("FinalPrice", "sum"),
            PartySize=("PartySize", "mean"),
            order_id=("order_id", "count"),
        ).rename(columns={"FinalPrice": "total_revenue", "PartySize": "party_size_avg", "order_id": "order_count"}).reset_index()
        daily["order_date"] = pd.to_datetime(daily["order_date"])
        daily["year"] = daily["order_date"].dt.year
        daily["month"] = daily["order_date"].dt.month
        daily["day"] = daily["order_date"].dt.day
        daily["dayofweek"] = daily["order_date"].dt.dayofweek
        daily["is_weekend"] = (daily["dayofweek"] >= 5).astype(int)
        daily["is_month_end"] = (daily["day"] >= 25).astype(int)
        daily["day_type"] = daily["order_date"].apply(self._get_day_type)
        daily["day_type_code"] = daily["day_type"].apply(self._day_type_code)
        return daily

    def train(self, orders: pd.DataFrame) -> dict[str, float]:
        """Fit model từ dataset do training pipeline cung cấp và trả metrics."""
        daily = self.prepare_features(orders)
        if daily.empty:
            raise ValueError("No completed orders are available for revenue training.")
        self.dow_stats = daily.groupby("dayofweek")["total_revenue"].mean().to_dict()
        self.day_type_stats = daily.groupby("day_type")["total_revenue"].mean().to_dict()
        self.global_avg_revenue = float(daily["total_revenue"].mean())
        self.global_party_size_avg = float(daily["party_size_avg"].mean())
        self.global_order_count = float(daily["order_count"].mean())
        daily["avg_revenue_by_dow"] = daily["dayofweek"].map(self.dow_stats)
        daily["avg_revenue_by_day_type"] = daily["day_type"].map(self.day_type_stats)
        features, target = daily[self.feature_columns], daily["total_revenue"]
        self.model = RandomForestRegressor(n_estimators=300, min_samples_leaf=2, random_state=42)
        self.model.fit(features, target)
        predicted = self.model.predict(features)
        return {
            "mae": round(float(mean_absolute_error(target, predicted)), 4),
            "rmse": round(float(np.sqrt(mean_squared_error(target, predicted))), 4),
            "r2": round(float(r2_score(target, predicted)), 4),
        }

    def predict(self, value: datetime) -> float:
        """Dự báo một ngày bằng model và thống kê đã được persist cùng artifact."""
        if self.model is None:
            raise RuntimeError("Revenue model is not loaded.")
        day_type = self._get_day_type(pd.Timestamp(value))
        dow = value.weekday()
        row = {
            "year": value.year, "month": value.month, "day": value.day, "dayofweek": dow,
            "is_weekend": int(dow >= 5), "is_month_end": int(value.day >= 25),
            "day_type_code": self._day_type_code(day_type),
            "party_size_avg": self.global_party_size_avg, "order_count": self.global_order_count,
            "avg_revenue_by_dow": self.dow_stats.get(dow, self.global_avg_revenue),
            "avg_revenue_by_day_type": self.day_type_stats.get(day_type, self.global_avg_revenue),
        }
        return max(0.0, float(self.model.predict(pd.DataFrame([row])[self.feature_columns])[0]))
