export interface Ingredient {
  id: number;
  name: string;
  unit: string;
  rawMaterialCost: number;
  stockQuantity: number;
  minStock: number;
  created: string | Date;
  updated: string | Date;
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
