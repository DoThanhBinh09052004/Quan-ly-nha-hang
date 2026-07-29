"""Lớp duy nhất truy cập MySQL cho dữ liệu training và lookup runtime."""

import pandas as pd
from sqlalchemy import create_engine, text

from config import DB_CONFIG


def get_engine():
    """Tạo SQLAlchemy engine từ cấu hình môi trường, không chứa business logic."""
    connection = (
        f"mysql+pymysql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@"
        f"{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
    )
    return create_engine(connection)


def load_orders_data() -> pd.DataFrame:
    """Lấy các order đã thanh toán, là nguồn train revenue forecast."""
    query = """
    SELECT o.Id AS order_id, o.Created AS order_date, o.TotalPrice, o.Discount,
           o.FinalPrice, o.PaidAmount, o.PartySize, o.GuestId, o.CheckInTime,
           o.CheckOutTime, TIMESTAMPDIFF(MINUTE, o.CheckInTime, o.CheckOutTime) AS duration_minutes
    FROM `order` o
    WHERE o.Deleted = 0 AND o.StatusId = 3
    """
    frame = pd.read_sql(query, get_engine())
    for column in ("order_date", "CheckInTime", "CheckOutTime"):
        frame[column] = pd.to_datetime(frame[column])
    return frame


def load_order_items() -> pd.DataFrame:
    """Lấy item của order hoàn tất để training market-basket rules."""
    query = """
    SELECT oi.OrderId, oi.ItemId, oi.Name AS item_name, oi.Quantity
    FROM orderitem oi JOIN `order` o ON oi.OrderId = o.Id
    WHERE oi.Deleted = 0 AND o.StatusId = 3
    """
    return pd.read_sql(query, get_engine())


def get_top_selling_items(top_n: int = 5) -> list[dict]:
    """Trả món bán chạy làm fallback khi recommendation artifact chưa sẵn sàng."""
    query = """
    SELECT Name AS item, COUNT(Id) AS frequency
    FROM orderitem WHERE Deleted = 0
    GROUP BY Name ORDER BY frequency DESC LIMIT :top_n
    """
    with get_engine().connect() as connection:
        result = connection.execute(text(query), {"top_n": top_n})
        return [{"item": row[0], "confidence": 0.5, "lift": 1.0} for row in result]


def load_guests_data() -> pd.DataFrame:
    """Giữ hàm tương thích cho các báo cáo cũ cần snapshot guest."""
    query = "SELECT Id AS guest_id, Name, Phone, Points, Created FROM guest WHERE Deleted = 0"
    return pd.read_sql(query, get_engine())


def load_ingredient_daily_usage(months: int = 6) -> pd.DataFrame:
    """Suy ra lượng nguyên liệu đã dùng gần đây từ order item và recipe."""
    months = max(1, min(int(months), 24))
    query = """
    SELECT DATE(oi.Created) AS usage_date, r.IngredientId AS ingredient_id,
           SUM(oi.Quantity * r.QuantityNeeded) AS qty_used
    FROM orderitem oi JOIN recipe r ON r.ItemId = oi.ItemId
    WHERE oi.Deleted = 0 AND oi.Voided = 0
      AND oi.Created >= DATE_SUB(CURDATE(), INTERVAL :months MONTH)
    GROUP BY DATE(oi.Created), r.IngredientId
    ORDER BY usage_date, ingredient_id
    """
    with get_engine().connect() as connection:
        return pd.read_sql(text(query), connection, params={"months": months})


def load_ingredients_inventory() -> pd.DataFrame:
    """Lấy tồn kho hiện tại; không phải input của quá trình train model."""
    query = """
    SELECT Id AS ingredient_id, Name, Unit, StockQuantity, MinStock
    FROM ingredient WHERE Deleted = 0
    """
    return pd.read_sql(query, get_engine())
