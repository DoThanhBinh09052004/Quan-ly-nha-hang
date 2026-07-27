import { Status } from './status.model';

export interface GuestTable {
    id: number;
    name: string;
    description?: string;
    created: Date;
    updated: Date;
    deleted: boolean;
    capacity: number;
    floor: number;
    statusId?: number;
    statusManuallyOverridden?: boolean;
    status?: Status;
    currentOrderTotal?: number;
    currentGuestName?: string;
}
