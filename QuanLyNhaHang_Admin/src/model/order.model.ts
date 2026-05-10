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