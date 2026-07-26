import { GuestTable } from './guesttable.model';

export interface OrderListQuery {
  page: number;
  pageSize: number;
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OrderStatusLookup {
  id: number;
  name: string;
}

export interface OrderListItem {
  id: number;
  orderNumber: string;
  created: Date;
  updated: Date;
  totalPrice: number;
  discount: number;
  finalPrice: number;
  paidAmount: number;
  changeAmount: number;
  guestPhone?: string;
  guestTableId?: number;
  reservationId?: number;
  guestTable?: GuestTable;
  status?: OrderStatusLookup;
}

export interface OrderListResponse {
  items: OrderListItem[];
  totalRecords: number;
  todayRevenue: number;
}
