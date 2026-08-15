export interface Ingredient {
  id: number;
  name: string;
  unit: string;
  stockQuantity: number;
  minStock: number;
  batchCount: number;
  expiringSoonBatchCount: number;
  earliestExpirationDate: string | null;
  created: string | Date;
  updated: string | Date;
}

export interface CreateIngredientRequest {
  name: string;
  unit: string;
  minStock: number;
}

export interface UpdateIngredientRequest extends CreateIngredientRequest {
  id: number;
}

export interface IngredientBatch {
  id: number;
  ingredientId: number;
  batchCode: string;
  receivedDate: string;
  expirationDate: string;
  unitCost: number;
  receivedQuantity: number;
  remainingQuantity: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  created: string | Date;
  updated: string | Date;
}

export interface CreateIngredientBatchRequest {
  batchCode?: string;
  receivedDate: string;
  expirationDate: string;
  unitCost: number;
  quantity: number;
}

export interface UpdateIngredientBatchRequest {
  id: number;
  batchCode?: string;
  receivedDate: string;
  expirationDate: string;
  unitCost: number;
  receivedQuantity: number;
}

export interface AiIngredientRestockRow {
  ingredientId: number;
  name: string;
  unit: string;
  stockQuantity: number;
  minStock: number;
  forecastTotalUsed: number;
  suggestedBuy: number;
}

export interface AiIngredientDailyForecastRow {
  date: string;
  ingredientId: number;
  predictedQtyUsed: number;
}
