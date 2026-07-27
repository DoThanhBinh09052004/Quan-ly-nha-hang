export interface Reservation {
  id: number;
  guestTableId: number;
  guestTableName?: string;
  guestId?: number;
  guestName: string;
  phone: string;
  partySize: number;
  reservationTime: string;
  durationMinutes: number;
  reservationEndTime: string;
  status: string;
  note?: string;
  created: string;
  updated: string;
}

export interface ReservationRequest {
  guestTableId: number;
  guestId?: number;
  guestName: string;
  phone: string;
  partySize: number;
  reservationTime: string;
  durationMinutes: number;
  note?: string;
}

export interface ReservationTableQuery {
  start: string;
  durationMinutes: number;
  partySize: number;
  excludedReservationId?: number;
}
