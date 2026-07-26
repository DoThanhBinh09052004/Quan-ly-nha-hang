import { User } from '../../../../model/user.model';

export interface Shift {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export interface WorkShift {
  id: number;
  userId: number;
  user?: Pick<User, 'id' | 'username' | 'fullName'>;
  shiftId: number;
  shift?: Shift;
  workDate: string;
  note?: string;
  penaltyAmount: number;
}

export interface PayrollEmployee {
  userId: number;
  username: string;
  fullName?: string;
  shiftSalary: number;
  workShiftCount: number;
  grossSalary: number;
  deductionAmount: number;
  netSalary: number;
}

export interface PayrollReport {
  periodType: 'weekly' | 'monthly';
  fromDate: string;
  toDate: string;
  totalWorkShifts: number;
  totalNetSalary: number;
  employees: PayrollEmployee[];
}
