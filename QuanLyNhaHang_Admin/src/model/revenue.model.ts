export interface GrossProfitMarginReportItem {
  year: number;
  month?: number;
  day?: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
}

export interface GrossProfitMarginReport {
  daily: GrossProfitMarginReportItem[];
  monthly: GrossProfitMarginReportItem[];
  yearly: GrossProfitMarginReportItem[];
}

export interface BusinessOverview {
  totalRevenue: number;
  ingredientCost: number;
  operatingExpense: number;
  totalCost: number;
  grossProfit: number;
  netProfit: number;
  netProfitMargin: number;
  totalOrders: number;
}

export interface PayrollWorkShiftDetail {
  workShiftId: number;
  workDate: string;
  shiftId: number;
  shiftName: string;
  startTime: string;
  endTime: string;
  shiftHours: number;
  note?: string;
  deductionAmount: number;
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
  workShifts: PayrollWorkShiftDetail[];
}

export interface PayrollReport {
  periodType: string;
  targetDate: string;
  fromDate: string;
  toDate: string;
  totalEmployees: number;
  totalWorkShifts: number;
  totalGrossSalary: number;
  totalDeduction: number;
  totalNetSalary: number;
  employees: PayrollEmployee[];
}

export interface NetProfitReportItem {
  year: number;
  month?: number;
  day?: number;
  totalRevenue: number;
  ingredientCost: number;
  operatingExpense: number;
  netProfit: number;
  netProfitMargin: number;
}

export interface NetProfitReport {
  daily: NetProfitReportItem[];
  monthly: NetProfitReportItem[];
  yearly: NetProfitReportItem[];
}
