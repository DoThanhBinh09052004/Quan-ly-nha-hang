from __future__ import annotations

from typing import Any

from models.ingredient_demand import IngredientDemandModel
from models.recommendation import RecommendationModel
from models.revenue_forecast import RevenueForecastModel
from models.customer_segment import CustomerSegmentModel


def serialize_revenue(model: RevenueForecastModel) -> dict[str, Any]:
    """Đưa state revenue predictor vào payload không phụ thuộc filesystem."""
    return {
        "model": model.model,
        "dow_stats": model.dow_stats,
        "day_type_stats": model.day_type_stats,
        "global_party_size_avg": model.global_party_size_avg,
        "global_order_count": model.global_order_count,
        "global_avg_revenue": model.global_avg_revenue,
    }


def deserialize_revenue(payload: dict[str, Any]) -> RevenueForecastModel:
    """Khôi phục revenue predictor từ payload đã được artifact store đọc."""
    model = RevenueForecastModel()
    model.model = payload.get("model")
    model.dow_stats = payload.get("dow_stats", {})
    model.day_type_stats = payload.get("day_type_stats", {})
    model.global_party_size_avg = payload.get("global_party_size_avg", 2.5)
    model.global_order_count = payload.get("global_order_count", 1)
    model.global_avg_revenue = payload.get("global_avg_revenue", 0)
    return model


def serialize_recommendation(model: RecommendationModel) -> dict[str, Any]:
    """Đóng gói association rules cùng dữ liệu phụ trợ."""
    return {"rules": model.rules, "item_names": model.item_names}


def deserialize_recommendation(payload: dict[str, Any]) -> RecommendationModel:
    """Khôi phục recommendation predictor từ payload."""
    model = RecommendationModel()
    model.rules = payload.get("rules")
    model.item_names = payload.get("item_names", {})
    return model


def serialize_ingredient_demand(model: IngredientDemandModel) -> dict[str, Any]:
    """Đóng gói forest và history cần thiết để dự báo tuần tự."""
    return {"model": model.model, "history": model.history, "global_mean": model.global_mean}


def deserialize_ingredient_demand(payload: dict[str, Any]) -> IngredientDemandModel:
    """Khôi phục ingredient demand predictor từ payload."""
    model = IngredientDemandModel()
    model.model = payload.get("model")
    model.history = payload.get("history", model.history)
    model.global_mean = payload.get("global_mean", 0.0)
    return model


def serialize_customer_segment(model: CustomerSegmentModel) -> dict[str, Any]:
    """Đóng gói KMeans, scaler và nhãn cụm được tạo trong lần retrain."""
    return {"model": model.model, "scaler": model.scaler, "cluster_labels": model.cluster_labels}


def deserialize_customer_segment(payload: dict[str, Any]) -> CustomerSegmentModel:
    """Khôi phục segmentation predictor và nhãn cố định từ artifact."""
    model = CustomerSegmentModel()
    model.model = payload.get("model")
    model.scaler = payload.get("scaler")
    model.cluster_labels = payload.get("cluster_labels", {})
    return model
