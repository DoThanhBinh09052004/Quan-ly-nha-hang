from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from artifacts.model_store import ModelArtifactStore
from artifacts.serializers import (
    deserialize_ingredient_demand,
    deserialize_recommendation,
    deserialize_revenue,
    deserialize_customer_segment,
)


@dataclass
class ModelRegistry:
    store: ModelArtifactStore = field(default_factory=ModelArtifactStore)
    revenue_model: Any = None
    recommend_model: Any = None
    ingredient_demand_model: Any = None
    customer_segment_model: Any = None
    metadata: dict[str, dict[str, Any]] = field(default_factory=dict)
    errors: dict[str, str] = field(default_factory=dict)

    def load_all(self) -> None:
        """Nạp toàn bộ artifact lúc khởi động, không làm retrain hay truy vấn DB."""
        for model_name in ("revenue", "recommendation", "ingredient-demand", "customer-segment"):
            self.load(model_name)

    def load(self, model_name: str) -> None:
        """Nạp một artifact; lỗi được lưu thành status thay vì làm service chết."""
        try:
            artifact = self.store.load(model_name)
            payload = artifact["payload"]
            if model_name == "revenue":
                self.revenue_model = deserialize_revenue(payload)
            elif model_name == "recommendation":
                self.recommend_model = deserialize_recommendation(payload)
            elif model_name == "ingredient-demand":
                self.ingredient_demand_model = deserialize_ingredient_demand(payload)
            elif model_name == "customer-segment":
                self.customer_segment_model = deserialize_customer_segment(payload)
            else:
                raise ValueError(f"Unsupported model: {model_name}")
            self.metadata[model_name] = artifact.get("metadata", {})
            self.errors.pop(model_name, None)
        except Exception as error:
            self.errors[model_name] = str(error)

    def replace(self, model_name: str, model: object, metadata: dict[str, Any]) -> None:
        """Đổi predictor trong RAM sau khi training pipeline đã persist thành công."""
        if model_name == "revenue":
            self.revenue_model = model
        elif model_name == "recommendation":
            self.recommend_model = model
        elif model_name == "ingredient-demand":
            self.ingredient_demand_model = model
        elif model_name == "customer-segment":
            self.customer_segment_model = model
        else:
            raise ValueError(f"Unsupported model: {model_name}")
        self.metadata[model_name] = metadata
        self.errors.pop(model_name, None)

    def status(self) -> dict[str, dict[str, Any]]:
        """Trả readiness, metadata và lỗi load cho endpoint quản trị."""
        return {
            name: {
                "ready": getattr(self, attribute) is not None,
                "metadata": self.metadata.get(name),
                "error": self.errors.get(name),
            }
            for name, attribute in {
                "revenue": "revenue_model",
                "recommendation": "recommend_model",
                "ingredient-demand": "ingredient_demand_model",
                "customer-segment": "customer_segment_model",
            }.items()
        }
