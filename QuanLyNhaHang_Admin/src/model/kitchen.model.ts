/** A kitchen-facing order item returned by OrderItemController. */
export interface KitchenOrderItem {
  id: number;
  name: string;
  quantity: number;
  cookingStatusId: number;
  cookingStatusCode?: string | null;
  completedAt?: string | null;
  kitchenNote?: string | null;
  orderId: number;
  orderNumber?: string | null;
  guestTableId?: number | null;
  tableName?: string | null;
  guestPhone?: string | null;
}

export interface UpdateKitchenItemStatusRequest {
  orderItemId: number;
  cookingStatusCode: string;
  kitchenNote?: string | null;
}

export interface KitchenDashboard {
  pending: number;
  processing: number;
  completed: number;
  cancelled: number;
  lastUpdated: string;
}
