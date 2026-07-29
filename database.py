"""Compatibility facade; mã mới phải import từ repositories.restaurant_repository."""

from repositories.restaurant_repository import (
    get_engine,
    get_top_selling_items,
    load_ingredient_daily_usage,
    load_ingredients_inventory,
    load_guests_data,
    load_order_items,
    load_orders_data,
)

__all__ = [
    "get_engine", "get_top_selling_items", "load_ingredient_daily_usage",
    "load_ingredients_inventory", "load_guests_data", "load_order_items", "load_orders_data",
]
