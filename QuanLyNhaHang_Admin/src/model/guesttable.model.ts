export interface GuestTable {
    id: number;
    name: string;
    description: string;
    created: Date;
    updated: Date;
    deleted: boolean;
    restaurantId?: number;
    statusId?: number;
}
