"""Public inference endpoints; các route này không train hoặc gọi OpenAI để gắn nhãn cụm."""

from datetime import date, datetime
from typing import Dict, List

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import globals
from repositories.restaurant_repository import (
    get_top_selling_items,
    load_ingredients_inventory,
    load_orders_data,
)


router = APIRouter()


class RevenuePredictRequest(BaseModel):
    """Dữ liệu ngày cần dự báo doanh thu."""
    date: date


class RevenuePredictResponse(BaseModel):
    """Kết quả doanh thu dự báo giữ nguyên contract với ASP.NET Core."""
    date: date
    predicted_revenue: float


class RecommendForTableRequest(BaseModel):
    """Danh sách món hiện có trên bàn để tìm món gợi ý."""
    current_items: List[str]
    top_n: int = 5


class RecommendForTableResponse(BaseModel):
    item: str
    confidence: float
    lift: float


class MarketBasketRequest(BaseModel):
    """Danh sách món dùng cho market-basket analysis."""
    items: List[str]
    top_n: int = 5


class MarketBasketResponse(BaseModel):
    item: str
    confidence: float
    lift: float


class CustomerSegmentGuest(BaseModel):
    """Feature đã được BE tổng hợp, không mang thông tin định danh cá nhân."""
    guest_id: int
    features: Dict[str, float]


class CustomerSegmentRequest(BaseModel):
    """Snapshot để tìm khách mục tiêu và đếm khách cùng cụm đã train."""
    target_guest_id: int
    guests: List[CustomerSegmentGuest]


class CustomerSegmentResponse(BaseModel):
    """Thông tin cụm và nhãn được persist từ lần retrain gần nhất."""
    guest_id: int
    cluster: int
    cluster_name: str
    cluster_description: str
    cluster_traits: List[str]
    guest_profile_name: str
    guest_profile_description: str
    guest_profile_traits: List[str]
    cluster_features: Dict[str, float]
    behavior_label: str
    behavior_description: str
    behavior_traits: List[str]
    features: Dict[str, float]


def _require_model(attribute: str, message: str):
    """Lấy model trong registry hoặc trả lỗi nhất quán khi artifact chưa sẵn sàng."""
    model = getattr(globals.model_registry, attribute)
    if model is None:
        raise HTTPException(status_code=503, detail=message)
    return model


@router.get("/health")
async def health_check() -> dict:
    """Xác nhận process đang chạy; readiness chi tiết xem ở admin status."""
    return {"status": "ok"}


@router.post("/predict/revenue", response_model=RevenuePredictResponse)
async def predict_revenue(request: RevenuePredictRequest) -> RevenuePredictResponse:
    """Dự báo doanh thu từ revenue artifact đang được phục vụ."""
    model = _require_model("revenue_model", "Revenue model is not loaded")
    if model.model is None:
        raise HTTPException(status_code=503, detail="Revenue model is not ready")
    prediction = model.predict(datetime.combine(request.date, datetime.min.time()))
    return RevenuePredictResponse(date=request.date, predicted_revenue=prediction)


@router.post("/recommend/for-table", response_model=List[RecommendForTableResponse])
async def recommend_for_table(request: RecommendForTableRequest) -> List[RecommendForTableResponse]:
    """Gợi ý món từ rules; fallback sang món bán chạy khi artifact không dùng được."""
    model = globals.model_registry.recommend_model
    recommendations = [] if model is None or model.rules is None else model.get_recommendations(request.current_items, request.top_n)
    if not recommendations:
        recommendations = get_top_selling_items(request.top_n)
    return [RecommendForTableResponse(item=row["item"], confidence=row["confidence"], lift=row["lift"]) for row in recommendations]


@router.post("/analyze/market-basket", response_model=List[MarketBasketResponse])
async def market_basket(request: MarketBasketRequest) -> List[MarketBasketResponse]:
    """Phân tích giỏ món với cùng rules và fallback như route gợi ý tại bàn."""
    model = globals.model_registry.recommend_model
    recommendations = [] if model is None or model.rules is None else model.get_recommendations(request.items, request.top_n)
    if not recommendations:
        recommendations = get_top_selling_items(request.top_n)
    return [MarketBasketResponse(item=row["item"], confidence=row["confidence"], lift=row["lift"]) for row in recommendations]


@router.get("/ingredient/forecast")
async def ingredient_restock_forecast(days: int = 14) -> list[dict]:
    """Dự báo nhu cầu và số lượng nhập dựa trên demand artifact cùng tồn kho hiện tại."""
    days = max(1, min(days, 90))
    model = _require_model("ingredient_demand_model", "Ingredient demand model is not loaded")
    result = []
    for row in load_ingredients_inventory().itertuples(index=False):
        forecast = model.forecast(int(row.ingredient_id), days)
        used = sum(item["predicted_qty_used"] for item in forecast)
        result.append({
            "ingredient_id": int(row.ingredient_id), "Name": row.Name, "Unit": row.Unit,
            "StockQuantity": float(row.StockQuantity), "MinStock": float(row.MinStock),
            "forecast_total_used": round(used, 4),
            "suggested_buy": round(max(0.0, used + float(row.MinStock) - float(row.StockQuantity)), 4),
        })
    return sorted(result, key=lambda item: item["suggested_buy"], reverse=True)


@router.get("/ingredient/forecast/{ingredient_id}")
async def ingredient_daily_forecast(ingredient_id: int, days: int = 14) -> list[dict]:
    """Trả forecast chi tiết của một nguyên liệu, giới hạn số ngày an toàn."""
    model = _require_model("ingredient_demand_model", "Ingredient demand model is not loaded")
    return model.forecast(ingredient_id, max(1, min(days, 90)))


@router.get("/analyze/peak-hours")
async def peak_hours(days: int = 30) -> list[dict]:
    """Phân tích giờ cao điểm từ order hoàn tất, không liên quan model artifact."""
    frame = load_orders_data()
    frame = frame[frame["order_date"] >= datetime.now() - pd.Timedelta(days=max(1, days))]
    frame["hour"] = pd.to_datetime(frame["CheckInTime"]).dt.hour
    peak = frame.groupby("hour")["order_id"].count().reset_index(name="order_count")
    return peak.sort_values("order_count", ascending=False).head(5).to_dict("records")


@router.get("/analyze/customer-segments")
async def get_segments() -> dict:
    """Giữ nguyên phản hồi placeholder của route cũ để tránh đổi contract ngoài ý muốn."""
    return {"message": "Chưa implement chi tiết"}


@router.post("/analyze/customer-segment", response_model=CustomerSegmentResponse)
async def analyze_customer_segment(request: CustomerSegmentRequest) -> CustomerSegmentResponse:
    """Predict cụm đã train và trả nhãn lưu sẵn, tuyệt đối không gọi OpenAI tại đây."""
    model = _require_model("customer_segment_model", "Customer segment model is not loaded")
    guests = [guest.model_dump() if hasattr(guest, "model_dump") else guest.dict() for guest in request.guests]
    snapshot = model.predict_snapshot(guests)
    target = snapshot[snapshot["guest_id"] == request.target_guest_id]
    if target.empty:
        raise HTTPException(status_code=404, detail="Target guest is not in the snapshot")

    target_row = target.iloc[0]
    cluster = int(target_row["cluster"])
    cluster_size = int((snapshot["cluster"] == cluster).sum())
    label = model.cluster_labels.get(str(cluster), {})
    features = {column: round(float(target_row[column]), 2) for column in model.feature_columns}
    return CustomerSegmentResponse(
        guest_id=request.target_guest_id,
        cluster=cluster,
        cluster_name=f"Cụm {cluster + 1}",
        cluster_description=f"Có {cluster_size} khách trong snapshot hiện tại được dự đoán thuộc cụm này.",
        cluster_traits=[],
        guest_profile_name="Khách hàng trong cụm",
        guest_profile_description="Cụm được dự đoán bằng model customer segmentation đã train.",
        guest_profile_traits=[],
        cluster_features=model.cluster_center(cluster),
        # Artifact legacy chưa có nhãn vẫn trả nội dung an toàn, không gọi OpenAI khi xem khách.
        behavior_label=str(label.get("behavior_label") or f"Cụm {cluster + 1}"),
        behavior_description=str(label.get("behavior_description") or "Nhãn hành vi chi tiết sẽ được tạo ở lần retrain segmentation tiếp theo."),
        behavior_traits=[str(item) for item in label.get("behavior_traits", [])][:4],
        features=features,
    )
