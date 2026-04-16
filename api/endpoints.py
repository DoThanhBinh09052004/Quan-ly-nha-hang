from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, date
from typing import List
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Import từ globals thay vì main
import globals
from database import load_orders_data, load_guests_data, get_top_selling_items

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

class CustomerSegmentRequest(BaseModel):
    guest_id: int

class CustomerSegmentResponse(BaseModel):
    guest_id: int
    cluster: int
    features: dict

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

@router.post("/analyze/customer-segment", response_model=CustomerSegmentResponse)
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