from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, date
from typing import Dict, List
import asyncio
import json
import urllib.error
import urllib.request
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Import từ globals thay vì main
import globals
from database import load_orders_data, load_guests_data, get_top_selling_items, load_ingredients_inventory

router = APIRouter()

# Định nghĩa request/response models
class RevenuePredictRequest(BaseModel):
    date: date

class RevenuePredictResponse(BaseModel):
    date: date
    predicted_revenue: float

class RecommendForTableRequest(BaseModel):
    current_items: List[str]
    top_n: int = 5

class RecommendForTableResponse(BaseModel):
    item: str
    confidence: float
    lift: float

class MarketBasketRequest(BaseModel):
    items: List[str]
    top_n: int = 5

class MarketBasketResponse(BaseModel):
    item: str
    confidence: float
    lift: float

class CustomerSegmentGuest(BaseModel):
    guest_id: int
    features: Dict[str, float]

class CustomerSegmentRequest(BaseModel):
    target_guest_id: int
    guests: List[CustomerSegmentGuest]

class CustomerSegmentResponse(BaseModel):
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

@router.get('/ingredient/forecast')
async def ingredient_restock_forecast(days: int = 14):
    """Dự báo tổng dùng và lượng cần mua cho toàn bộ nguyên liệu còn hoạt động."""
    days = max(1, min(days, 90))
    inventory = load_ingredients_inventory()
    result = []
    for row in inventory.itertuples(index=False):
        forecast = globals.ingredient_demand_model.forecast(int(row.ingredient_id), days)
        used = sum(item['predicted_qty_used'] for item in forecast)
        # Đảm bảo sau khi dự báo vẫn tồn tối thiểu; không trả số âm.
        suggested = max(0.0, used + float(row.MinStock) - float(row.StockQuantity))
        result.append({
            'ingredient_id': int(row.ingredient_id), 'Name': row.Name, 'Unit': row.Unit,
            'StockQuantity': float(row.StockQuantity), 'MinStock': float(row.MinStock),
            'forecast_total_used': round(used, 4), 'suggested_buy': round(suggested, 4)
        })
    return sorted(result, key=lambda item: item['suggested_buy'], reverse=True)

@router.get('/ingredient/forecast/{ingredient_id}')
async def ingredient_daily_forecast(ingredient_id: int, days: int = 14):
    return globals.ingredient_demand_model.forecast(ingredient_id, days)

# API endpoints
@router.get("/health")
async def health_check():
    return {"status": "ok"}

@router.post("/predict/revenue", response_model=RevenuePredictResponse)
async def predict_revenue(request: RevenuePredictRequest):
    try:
        if globals.revenue_model.model is None:
            raise HTTPException(status_code=500, detail="Revenue model not loaded yet")
        
        pred = globals.revenue_model.predict(datetime.combine(request.date, datetime.min.time()))
        return RevenuePredictResponse(date=request.date, predicted_revenue=pred)
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recommend/for-table", response_model=List[RecommendForTableResponse])
async def recommend_for_table(request: RecommendForTableRequest):
    try:
        # Fallback 1: Nếu model chưa được load, trả về món bán chạy
        if globals.recommend_model.rules is None:
            print("Warning: Recommendation model not loaded, using fallback top selling items")
            recs = get_top_selling_items(request.top_n)
            return [RecommendForTableResponse(item=r['item'], confidence=r['confidence'], lift=r['lift']) for r in recs]
            
        recs = globals.recommend_model.get_recommendations(request.current_items, request.top_n)
        
        # Fallback 2: Nếu model không tìm thấy gợi ý phù hợp, trả về món bán chạy
        if not recs:
            print("No recommendations found for current items, using fallback top selling items")
            recs = get_top_selling_items(request.top_n)
            
        return [RecommendForTableResponse(item=r['item'], confidence=r['confidence'], lift=r['lift']) for r in recs]
    except Exception as e:
        print(f"Error in recommendation: {e}")
        # Fallback cuối cùng nếu có bất kỳ lỗi nào xảy ra
        try:
            recs = get_top_selling_items(request.top_n)
            return [RecommendForTableResponse(item=r['item'], confidence=r['confidence'], lift=r['lift']) for r in recs]
        except:
            raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze/market-basket", response_model=List[MarketBasketResponse])
async def market_basket(request: MarketBasketRequest):
    try:
        if globals.recommend_model.rules is None:
            print("Warning: Market basket model not loaded, using fallback top selling items")
            recs = get_top_selling_items(request.top_n)
            return [MarketBasketResponse(item=r['item'], confidence=r['confidence'], lift=r['lift']) for r in recs]
            
        recs = globals.recommend_model.get_recommendations(request.items, request.top_n)
        
        if not recs:
            recs = get_top_selling_items(request.top_n)
            
        return [MarketBasketResponse(item=r['item'], confidence=r['confidence'], lift=r['lift']) for r in recs]
    except Exception as e:
        print(f"Error in market basket: {e}")
        try:
            recs = get_top_selling_items(request.top_n)
            return [MarketBasketResponse(item=r['item'], confidence=r['confidence'], lift=r['lift']) for r in recs]
        except:
            raise HTTPException(status_code=500, detail=str(e))

@router.get("/analyze/peak-hours")
async def peak_hours(days: int = 30):
    """Phân tích giờ cao điểm từ dữ liệu order"""
    import pandas as pd
    from datetime import datetime
    
    df = load_orders_data()
    df = df[df['order_date'] >= datetime.now() - pd.Timedelta(days=days)]
    df['hour'] = pd.to_datetime(df['CheckInTime']).dt.hour
    peak = df.groupby('hour')['order_id'].count().reset_index()
    peak.columns = ['hour', 'order_count']
    peak = peak.sort_values('order_count', ascending=False).head(5)
    return peak.to_dict('records')

@router.get("/analyze/customer-segments")
async def get_segments():
    """Lấy thông tin các cụm khách hàng"""
    return {"message": "Chưa implement chi tiết"}

# Deprecated implementation retained temporarily for reference; it is not routed.
async def get_customer_segment(request: CustomerSegmentRequest):
    """Lấy cụm của một khách hàng cụ thể"""
    try:
        if globals.segment_model.model is None:
            raise HTTPException(status_code=500, detail="Segment model not loaded yet")
            
        df_orders = load_orders_data()
        df_guests = load_guests_data()
        
        guest_orders = df_orders[df_orders['GuestId'] == request.guest_id]
        guest_info = df_guests[df_guests['guest_id'] == request.guest_id]
        
        if len(guest_orders) == 0 or len(guest_info) == 0:
            raise HTTPException(status_code=404, detail="Guest not found")
        
        from models.customer_segment import CustomerSegmentModel
        temp_model = CustomerSegmentModel()
        features_df, _ = temp_model.prepare_features(guest_orders, guest_info)
        
        if len(features_df) > 0:
            features = features_df.iloc[0].values.tolist()
            cluster = globals.segment_model.predict(features)
            
            return CustomerSegmentResponse(
                guest_id=request.guest_id,
                cluster=int(cluster),
                features=features_df.iloc[0].to_dict()
            )
        else:
            return CustomerSegmentResponse(
                guest_id=request.guest_id,
                cluster=-1,
                features={}
            )
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/customer-segment", response_model=CustomerSegmentResponse)
async def analyze_customer_segment(request: CustomerSegmentRequest):
    """Cluster a BE-provided, privacy-safe snapshot and assess the target cluster."""
    try:
        guests = [guest.model_dump() if hasattr(guest, 'model_dump') else guest.dict() for guest in request.guests]
        frame, centers = globals.segment_model.cluster_snapshot(guests)
        target = frame[frame['guest_id'] == request.target_guest_id]
        if target.empty:
            raise HTTPException(status_code=404, detail="Target guest is not in the snapshot")

        target_row = target.iloc[0]
        cluster = int(target_row['cluster'])
        cluster_rows = frame[frame['cluster'] == cluster]
        feature_columns = globals.segment_model.feature_columns
        cluster_features = {key: round(float(centers.loc[cluster, key]), 2) for key in feature_columns}
        features = {key: round(float(target_row[key]), 2) for key in feature_columns}
        behavior = await describe_cluster_with_openai(cluster_rows, cluster_features)
        return CustomerSegmentResponse(
            guest_id=request.target_guest_id,
            cluster=cluster,
            cluster_name=f"Cụm {cluster + 1}",
            cluster_description=f"Gồm {len(cluster_rows)} khách hàng có hành vi giao dịch tương đồng.",
            cluster_traits=[],
            guest_profile_name="Khách hàng trong cụm",
            guest_profile_description="So sánh chỉ số khách với trung tâm cụm bên dưới.",
            guest_profile_traits=[],
            cluster_features=cluster_features,
            behavior_label=behavior['behavior_label'],
            behavior_description=behavior['behavior_description'],
            behavior_traits=behavior['behavior_traits'],
            features=features
        )
    except HTTPException:
        raise
    except Exception as error:
        print(f"Customer segment analysis error: {error}")
        raise HTTPException(status_code=500, detail=str(error))


async def describe_cluster_with_openai(cluster_rows, cluster_features):
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        return {'behavior_label': '', 'behavior_description': '', 'behavior_traits': []}

    summary = {
        'cluster_size': int(len(cluster_rows)),
        'cluster_center': cluster_features,
        'overall_average': {key: round(float(cluster_rows[key].mean()), 2)
                            for key in globals.segment_model.feature_columns}
    }
    body = {
        'model': os.getenv('OPENAI_MODEL', 'gpt-4.1-mini'),
        'temperature': 0.2,
        'response_format': {'type': 'json_object'},
        'messages': [
            {'role': 'system', 'content': 'Bạn là chuyên gia CRM nhà hàng. Chỉ phân tích dữ liệu tổng hợp, không suy đoán dữ liệu cá nhân. Trả JSON gồm behavior_label, behavior_description tối đa 2 câu, behavior_traits tối đa 4 mục.'},
            {'role': 'user', 'content': json.dumps(summary, ensure_ascii=False)}
        ]
    }
    http_request = urllib.request.Request(
        'https://api.openai.com/v1/chat/completions',
        data=json.dumps(body).encode('utf-8'),
        headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
        method='POST'
    )
    try:
        timeout_seconds = max(1, int(os.getenv('OPENAI_TIMEOUT_SECONDS', '45')))
        response = await asyncio.to_thread(urllib.request.urlopen, http_request, timeout=timeout_seconds)
        with response:
            result = json.loads(response.read().decode('utf-8'))
        parsed = json.loads(result['choices'][0]['message']['content'])
        return {
            'behavior_label': str(parsed.get('behavior_label', '')),
            'behavior_description': str(parsed.get('behavior_description', '')),
            'behavior_traits': [str(item) for item in parsed.get('behavior_traits', [])][:4]
        }
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, ValueError, json.JSONDecodeError):
        return {'behavior_label': '', 'behavior_description': '', 'behavior_traits': []}
