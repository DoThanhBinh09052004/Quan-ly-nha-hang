import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { Ingredient } from '../../../../../model/ingredient.model';

@Component({
  selector: 'app-ingredient-list',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, InputTextModule, TagModule],
  templateUrl: './ingredient-list.component.html',
  styleUrls: ['../../ingredient.scss']
})
export class IngredientListComponent {
  @Input() ingredients: Ingredient[] = [];
  @Input() selectedIngredients: Ingredient[] = [];
  @Input() loading = false;

  @Output() selectedIngredientsChange = new EventEmitter<Ingredient[]>();
  @Output() edit = new EventEmitter<Ingredient>();
  @Output() delete = new EventEmitter<Ingredient>();
  @Output() showForecast = new EventEmitter<Ingredient>();

  @ViewChild('dt') table!: Table;

  onSelectionChange(selection: Ingredient[]) {
    this.selectedIngredients = selection;
    this.selectedIngredientsChange.emit(selection);
  }

  filter(event: Event): void {
    if (this.table) {
      this.table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }
  }

  status(ingredient: Ingredient): 'danger' | 'warn' | 'success' {
    if (ingredient.stockQuantity <= ingredient.minStock) return 'danger';
    return ingredient.stockQuantity <= ingredient.minStock * 1.25 ? 'warn' : 'success';
  }

  statusText(ingredient: Ingredient): string {
    if (ingredient.stockQuantity <= ingredient.minStock) return 'Cần nhập hàng';
    return ingredient.stockQuantity <= ingredient.minStock * 1.25 ? 'Sắp thiếu' : 'Đủ hàng';
  }
}
