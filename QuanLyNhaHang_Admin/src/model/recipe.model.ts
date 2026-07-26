export interface Recipe {
  id: number;
  itemId: number;
  itemName?: string;
  ingredientId: number;
  ingredientName?: string;
  quantityNeeded: number;
  created: string | Date;
  updated: string | Date;
}
