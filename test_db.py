from database import load_orders_data, load_order_items

df_orders = load_orders_data()
print(df_orders.head())
print(f"Total orders: {len(df_orders)}")

df_items = load_order_items()
print(df_items.head())