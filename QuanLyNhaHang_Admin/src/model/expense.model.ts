export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
}

export interface Expense {
  id: number;
  title: string;
  note?: string;
  amount: number;
  expenseDate: string;
  expenseCategory?: ExpenseCategory;
}

export interface ExpenseRequest {
  id?: number;
  title: string;
  note?: string;
  amount: number;
  expenseDate: string;
  expenseCategoryId: number;
}
