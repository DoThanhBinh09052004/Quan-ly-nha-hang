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
    discount?: number;
    pointsUsed?: number; 
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
    orderItems: CreateOrderItemRequest[];
}
