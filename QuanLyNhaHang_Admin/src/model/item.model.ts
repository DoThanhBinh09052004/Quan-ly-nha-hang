import { Category } from "./category.model";
import { ItemImage } from "./itemimage.model";
import { Unit } from "./unit.model";

export interface Item {
    id: number;
    name: string;
    description: string;
    price: number;
    discount: number;
    quantity: number;
    created: Date;
    updated: Date;
    deleted: boolean;
    unitId?: number;
    unit?: Unit;
    categoryId?: number;
    category?: Category;
    itemImages?: ItemImage[];
  }

