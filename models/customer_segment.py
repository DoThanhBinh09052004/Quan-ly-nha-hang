"""Model customer segmentation được train và persist theo từng phiên bản."""

from __future__ import annotations

import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler


class CustomerSegmentModel:
    """Predict cụm khách bằng KMeans đã train, không fit lại trong request xem khách."""

    feature_columns = [
        "recency_days", "frequency", "monetary_sum", "monetary_avg", "party_avg",
        "duration_avg", "weekend_ratio", "evening_ratio", "tenure_days", "points",
        "account_age_days",
    ]

    def __init__(self, n_clusters: int = 10) -> None:
        self.n_clusters = n_clusters
        self.model: KMeans | None = None
        self.scaler: StandardScaler | None = None
        # Nhãn do OpenAI tạo lúc retrain, key là ID cụm cố định trong artifact.
        self.cluster_labels: dict[str, dict] = {}

    def dataframe_from_payload(self, guests: list[dict]) -> pd.DataFrame:
        """Chuẩn hoá snapshot từ BE thành đúng thứ tự feature mà model đã train."""
        return pd.DataFrame([
            {
                "guest_id": guest["guest_id"],
                **{column: float(guest.get("features", {}).get(column, 0)) for column in self.feature_columns},
            }
            for guest in guests
        ], columns=["guest_id", *self.feature_columns])

    def prepare_features(self, orders: pd.DataFrame, guests: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
        """Tạo dữ liệu training từ lịch sử order hoàn tất và thông tin guest tối thiểu."""
        if orders.empty or guests.empty:
            return pd.DataFrame(columns=self.feature_columns), pd.DataFrame()
        orders = orders.copy()
        guests = guests.copy()
        orders["order_date"] = pd.to_datetime(orders["order_date"], errors="coerce")
        orders["CheckInTime"] = pd.to_datetime(orders.get("CheckInTime"), errors="coerce")
        for column in ("FinalPrice", "PartySize", "duration_minutes"):
            orders[column] = pd.to_numeric(orders.get(column), errors="coerce").fillna(0)
        orders = orders.dropna(subset=["GuestId", "order_date"])
        if orders.empty:
            return pd.DataFrame(columns=self.feature_columns), pd.DataFrame()

        reference_date = max(pd.Timestamp.now(), orders["order_date"].max())
        orders["is_weekend"] = (orders["order_date"].dt.dayofweek >= 5).astype(float)
        orders["is_evening"] = (orders["CheckInTime"].dt.hour >= 18).fillna(False).astype(float)
        statistics = orders.groupby("GuestId").agg(
            last_order=("order_date", "max"), first_order=("order_date", "min"),
            frequency=("order_id", "count"), monetary_sum=("FinalPrice", "sum"),
            monetary_avg=("FinalPrice", "mean"), party_avg=("PartySize", "mean"),
            duration_avg=("duration_minutes", "mean"), weekend_ratio=("is_weekend", "mean"),
            evening_ratio=("is_evening", "mean"),
        ).reset_index()
        statistics["recency_days"] = (reference_date - statistics["last_order"]).dt.days.clip(lower=0)
        statistics["tenure_days"] = (reference_date - statistics["first_order"]).dt.days.clip(lower=0)
        guests["Created"] = pd.to_datetime(guests.get("Created"), errors="coerce")
        guests["points"] = pd.to_numeric(guests.get("Points", 0), errors="coerce").fillna(0)
        guests["account_age_days"] = (reference_date - guests["Created"]).dt.days.clip(lower=0).fillna(0)
        frame = statistics.merge(
            guests[["guest_id", "points", "account_age_days"]],
            left_on="GuestId", right_on="guest_id", how="inner",
        )
        features = frame[self.feature_columns].replace([float("inf"), float("-inf")], 0).fillna(0)
        return features, frame

    def train(self, orders: pd.DataFrame, guests: pd.DataFrame) -> pd.DataFrame:
        """Fit scaler/KMeans một lần trong retrain và trả khách đã được gán cụm."""
        features, frame = self.prepare_features(orders, guests)
        if features.empty:
            raise ValueError("No guest order history is available to train customer segmentation.")
        self.scaler = StandardScaler()
        self.model = KMeans(n_clusters=min(self.n_clusters, len(features)), random_state=42, n_init=10)
        frame = frame.copy()
        frame["cluster"] = self.model.fit_predict(self.scaler.fit_transform(features))
        return frame

    def predict(self, features: dict[str, float]) -> int:
        """Dự đoán cụm bằng artifact đang chạy; không thay đổi model hoặc nhãn."""
        if self.model is None or self.scaler is None:
            raise RuntimeError("Customer segment model is not loaded.")
        row = pd.DataFrame([[float(features.get(column, 0)) for column in self.feature_columns]], columns=self.feature_columns)
        return int(self.model.predict(self.scaler.transform(row))[0])

    def predict_snapshot(self, guests: list[dict]) -> pd.DataFrame:
        """Predict cụm cho snapshot để tính số khách cùng cụm mà không re-cluster."""
        frame = self.dataframe_from_payload(guests)
        if frame.empty:
            return frame.assign(cluster=pd.Series(dtype=int))
        if self.model is None or self.scaler is None:
            raise RuntimeError("Customer segment model is not loaded.")
        frame["cluster"] = self.model.predict(self.scaler.transform(frame[self.feature_columns]))
        return frame

    def cluster_center(self, cluster: int) -> dict[str, float]:
        """Trả tâm cụm ở thang đo gốc để UI và OpenAI có thể diễn giải được."""
        if self.model is None or self.scaler is None:
            raise RuntimeError("Customer segment model is not loaded.")
        values = self.scaler.inverse_transform([self.model.cluster_centers_[cluster]])[0]
        return {column: round(float(value), 2) for column, value in zip(self.feature_columns, values)}

    def cluster_summaries(self, trained_frame: pd.DataFrame) -> dict[str, dict]:
        """Tạo dữ liệu aggregate an toàn để gắn nhãn từng cụm sau khi train."""
        summaries: dict[str, dict] = {}
        for cluster, rows in trained_frame.groupby("cluster"):
            summaries[str(int(cluster))] = {
                "cluster_size": int(len(rows)),
                "cluster_center": self.cluster_center(int(cluster)),
                "overall_average": {
                    column: round(float(rows[column].mean()), 2)
                    for column in self.feature_columns
                },
            }
        return summaries
