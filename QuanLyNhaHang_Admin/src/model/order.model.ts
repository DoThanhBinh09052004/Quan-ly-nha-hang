import { GuestTable } from "./guesttable.model";
import { OrderItem } from "./orderitem.model";

export interface Order {
    id: number;
    orderNumber: string;
    description: string;
    totalPrice: number;
    paidAmount: number;
    created: Date;
    updated: Date;
    changeAmount: number;
    orderItems?: OrderItem[]; 
    guestTableId?: number;
    guestTable?: GuestTable;
    guestPhone?: string;
    guestId?: number;
    partySize?: number;
    reservationId?: number;
    discount?: number;
    usedPoint?: number;
    finalPrice?: number;
}

export interface CreateOrderItemRequest {
    name: string;
    description?: string;
    quantity: number;
    salePrice: number;
    itemId?: number;
}

export interface CreateOrderRequest extends Omit<Order, 'id' | 'orderItems'> {
    pointsToUse?: number;
    orderItems: CreateOrderItemRequest[];
}

export interface UpdateOrderItemRequest extends CreateOrderItemRequest {
    id: number;
}

export interface UpdateOrderRequest {
    orderNumber?: string;
    description?: string;
    totalPrice: number;
    paidAmount: number;
    guestPhone?: string;
    guestId?: number;
    guestTableId?: number;
    discount?: number;
    finalPrice?: number;
    usedPoint?: number;
    orderItems: UpdateOrderItemRequest[];
}
