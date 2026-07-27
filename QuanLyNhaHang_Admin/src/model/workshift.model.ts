export interface Shift {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  description?: string | null;
}

export interface WorkShift {
  id: number;
  userId: number;
  shiftId: number;
  shift?: Shift | null;
  workDate: string;
  note?: string | null;
  penaltyAmount: number;
}
