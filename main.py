from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from api.endpoints import router
from database import load_orders_data, load_order_items, load_guests_data
import globals  # Import global models
import os

app = FastAPI(title="Nhà hàng AI Service", version="1.0")

# CORS cho phép frontend và backend C# gọi
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.on_event("startup")
async def load_models():
    """Load dữ liệu và train models khi khởi động"""
    print("Loading data...")
    df_orders = load_orders_data()
    df_items = load_order_items()
    df_guests = load_guests_data()
    
    print("Training revenue forecast model...")
    # Sử dụng global models
    model_path = os.path.join(os.getenv('MODEL_PATH', './saved_models/'), 'revenue_forecast.pkl')
    if os.path.exists(model_path):
        globals.revenue_model.load_model()
        print(f"Revenue model loaded. Model exists: {globals.revenue_model.model is not None}")
    else:
        globals.revenue_model.train(df_orders)
        globals.revenue_model.save_model()
    
    print("Training recommendation model...")
    rule_path = os.path.join(os.getenv('MODEL_PATH', './saved_models/'), 'recommendation_rules.pkl')
    if os.path.exists(rule_path):
        globals.recommend_model.load_model()
        print(f"Recommendation model loaded. Rules count: {len(globals.recommend_model.rules) if globals.recommend_model.rules is not None else 0}")
    else:
        globals.recommend_model.train(df_items)
        globals.recommend_model.save_model()
    
    print("Training customer segmentation model...")
    seg_path = os.path.join(os.getenv('MODEL_PATH', './saved_models/'), 'customer_segment.pkl')
    if os.path.exists(seg_path):
        globals.segment_model.load_model()
        print(f"Segment model loaded. Model exists: {globals.segment_model.model is not None}")
    else:
        globals.segment_model.train(df_orders, df_guests)
        globals.segment_model.save_model()
    
    print("All models loaded successfully!")

@app.get("/")
async def root():
    return {"message": "Nhà hàng AI Service is running"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)