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
