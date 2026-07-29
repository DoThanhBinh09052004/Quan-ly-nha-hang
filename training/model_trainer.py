from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from artifacts.model_store import ModelArtifactStore
from artifacts.serializers import (
    serialize_ingredient_demand,
    serialize_recommendation,
    serialize_revenue,
    serialize_customer_segment,
)
from models.customer_segment import CustomerSegmentModel
from models.ingredient_demand import IngredientDemandModel
from models.recommendation import RecommendationModel
from models.revenue_forecast import RevenueForecastModel
from repositories.restaurant_repository import (
    load_ingredient_daily_usage,
    load_order_items,
    load_orders_data,
    load_guests_data,
)


SUPPORTED_MODEL_NAMES = {"revenue", "recommendation", "ingredient-demand", "customer-segment"}


class ModelTrainer:
    def __init__(self, store: ModelArtifactStore | None = None) -> None:
        self._store = store or ModelArtifactStore()

    def build(self, model_name: str) -> tuple[object, dict[str, Any], dict[str, Any]]:
        """Tải dữ liệu và train trong RAM; caller quyết định thời điểm persist artifact."""
        if model_name not in SUPPORTED_MODEL_NAMES:
            raise ValueError(f"Unsupported model: {model_name}")

        trained_at = datetime.now(timezone.utc).isoformat()
        if model_name == "revenue":
            dataset = load_orders_data()
            model = RevenueForecastModel()
            metrics = model.train(dataset)
            payload = serialize_revenue(model)
        elif model_name == "recommendation":
            dataset = load_order_items()
            model = RecommendationModel()
            metrics = model.train(dataset)
            payload = serialize_recommendation(model)
        else:
            if model_name == "ingredient-demand":
                dataset = load_ingredient_daily_usage(months=6)
                model = IngredientDemandModel()
                model.train(dataset)
                metrics = {"history_row_count": int(len(model.history)), "uses_random_forest": model.model is not None}
                payload = serialize_ingredient_demand(model)
            else:
                orders, guests = load_orders_data(), load_guests_data()
                model = CustomerSegmentModel()
                trained_frame = model.train(orders, guests)
                dataset = trained_frame
                metrics = {"cluster_count": int(model.model.n_clusters), "labeled_guest_count": int(len(trained_frame))}
                payload = serialize_customer_segment(model)
                payload["cluster_summaries"] = model.cluster_summaries(trained_frame)

        metadata = {
            "trained_at": trained_at,
            "row_count": int(len(dataset)),
            "feature_version": 1,
            "metrics": metrics,
        }
        return model, metadata, payload

    def persist(self, model_name: str, payload: dict[str, Any], metadata: dict[str, Any]) -> None:
        """Lưu artifact sau khi các bước bổ sung như gắn nhãn AI đã hoàn tất."""
        self._store.save(model_name, payload, metadata)

    def train(self, model_name: str) -> tuple[object, dict[str, Any]]:
        """Luồng train thường cho model không cần gọi dịch vụ bên ngoài."""
        model, metadata, payload = self.build(model_name)
        self.persist(model_name, payload, metadata)
        return model, metadata
