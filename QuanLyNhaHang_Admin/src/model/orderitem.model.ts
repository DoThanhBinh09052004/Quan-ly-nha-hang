import { Item } from "./item.model";

export interface OrderItem {
    id: number;
    name: string;
    description?: string;
    created: Date;
    updated: Date;
    // deleted: boolean;
    // voided: boolean;
    quantity: number;
    salePrice: number;
    itemId?: number;
    orderId: number;
    item?: Item; 
}