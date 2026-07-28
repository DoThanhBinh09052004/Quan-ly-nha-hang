import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Ingredient } from '../../../../../model/ingredient.model';

@Component({
  selector: 'app-home-ingredient-alerts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-ingredient-alerts.component.html',
  styleUrls: ['./home-ingredient-alerts.component.scss']
})
export class HomeIngredientAlertsComponent {
  @Input() lowStockIngredients: Ingredient[] = [];
  @Output() viewIngredients = new EventEmitter<void>();

  getStockPercentage(ing: Ingredient): number {
    if (!ing.minStock || ing.minStock === 0) return 100;
    return Math.min(100, Math.round((ing.stockQuantity / ing.minStock) * 100));
  }

  onViewIngredientsClick() {
    this.viewIngredients.emit();
  }
}
