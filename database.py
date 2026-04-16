import pandas as pd
from sqlalchemy import create_engine, text
from config import DB_CONFIG

def get_engine():
    connection_str = f"mysql+pymysql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
    return create_engine(connection_str)

def load_orders_data():
    """Load dữ liệu đơn hàng đã thanh toán (statusId=3)"""
    engine = get_engine()
    query = """
    SELECT 
        o.Id as order_id,
        o.Created as order_date,
        o.TotalPrice,
        o.Discount,
        o.FinalPrice,
        o.PaidAmount,
        o.PartySize,
        o.GuestId,
        o.CheckInTime,
        o.CheckOutTime,
        TIMESTAMPDIFF(MINUTE, o.CheckInTime, o.CheckOutTime) as duration_minutes
    FROM `order` o
    WHERE o.Deleted = 0 AND o.StatusId = 3
    """
    df = pd.read_sql(query, engine)
    # Chuyển đổi kiểu dữ liệu
    df['order_date'] = pd.to_datetime(df['order_date'])
    df['CheckInTime'] = pd.to_datetime(df['CheckInTime'])
    df['CheckOutTime'] = pd.to_datetime(df['CheckOutTime'])
    return df

def load_order_items():
    """Load chi tiết đơn hàng để phân tích market basket"""
    engine = get_engine()
    query = """
    SELECT 
        oi.OrderId,
        oi.ItemId,
        oi.Name as item_name,
        oi.Quantity
    FROM orderitem oi
    JOIN `order` o ON oi.OrderId = o.Id
    WHERE oi.Deleted = 0 AND o.StatusId = 3
    """
    df = pd.read_sql(query, engine)
    return df

def get_top_selling_items(top_n=5):
    """Lấy danh sách các món bán chạy nhất làm fallback"""
    engine = get_engine()
    query = """
    SELECT 
        Name as item,
        COUNT(Id) as frequency
    FROM orderitem
    WHERE Deleted = 0
    GROUP BY Name
    ORDER BY frequency DESC
    LIMIT :top_n
    """
    with engine.connect() as conn:
        result = conn.execute(text(query), {"top_n": top_n})
        # Chuyển đổi kết quả sang định dạng giống với recommendation
        return [{"item": row[0], "confidence": 0.5, "lift": 1.0} for row in result]

def load_guests_data():
    """Load dữ liệu khách hàng"""
    engine = get_engine()
    query = """
    SELECT 
        Id as guest_id,
        Name,
        Phone,
        Points,
        Created
    FROM guest
    WHERE Deleted = 0
    """
    df = pd.read_sql(query, engine)
    return df