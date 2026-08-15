import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule, TableRowExpandEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { Ingredient, IngredientBatch } from '../../../../../model/ingredient.model';

type TagSeverity = 'danger' | 'warn' | 'success' | 'info' | 'secondary';

@Component({
  selector: 'app-ingredient-list',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, InputTextModule, TagModule],
  templateUrl: './ingredient-list.component.html',
  styleUrls: ['../../ingredient.scss'],
})
export class IngredientListComponent {
  @Input() ingredients: Ingredient[] = [];
  @Input() selectedIngredients: Ingredient[] = [];
  @Input() batchesByIngredient: Record<number, IngredientBatch[] | undefined> = {};
  @Input() batchLoading: Record<number, boolean> = {};
  @Input() loading = false;

  @Output() selectedIngredientsChange = new EventEmitter<Ingredient[]>();
  @Output() requestBatches = new EventEmitter<Ingredient>();
  @Output() addBatch = new EventEmitter<Ingredient>();
  @Output() editBatch = new EventEmitter<{ ingredient: Ingredient; batch: IngredientBatch }>();
  @Output() deleteBatch = new EventEmitter<{ ingredient: Ingredient; batch: IngredientBatch }>();
  @Output() edit = new EventEmitter<Ingredient>();
  @Output() delete = new EventEmitter<Ingredient>();
  @Output() showForecast = new EventEmitter<Ingredient>();

  @ViewChild('dt') table!: Table;

  onSelectionChange(selection: Ingredient[]): void {
    this.selectedIngredients = selection;
    this.selectedIngredientsChange.emit(selection);
  }

  onRowExpand(event: TableRowExpandEvent<Ingredient>): void {
    const ingredient = event.data;
    if (!this.batchesByIngredient[ingredient.id] && !this.batchLoading[ingredient.id]) {
      this.requestBatches.emit(ingredient);
    }
  }

  filter(event: Event): void {
    this.table?.filterGlobal((event.target as HTMLInputElement).value, 'contains');
  }

  ingredientStatus(ingredient: Ingredient): TagSeverity {
    if (ingredient.stockQuantity <= ingredient.minStock) return 'danger';
    if (ingredient.expiringSoonBatchCount > 0) return 'warn';
    if (ingredient.stockQuantity <= ingredient.minStock * 1.25) return 'warn';
    return 'success';
  }

  ingredientStatusText(ingredient: Ingredient): string {
    if (ingredient.stockQuantity <= ingredient.minStock) return 'Cần nhập hàng';
    if (ingredient.expiringSoonBatchCount > 0) return 'Có lô sắp hết hạn';
    if (ingredient.stockQuantity <= ingredient.minStock * 1.25) return 'Sắp thiếu';
    return 'Đủ hàng';
  }

  batchStatus(batch: IngredientBatch): TagSeverity {
    if (batch.remainingQuantity <= 0.000001) return 'secondary';
    if (batch.isExpired) return 'danger';
    if (batch.isExpiringSoon) return 'warn';
    return 'success';
  }

  batchStatusText(batch: IngredientBatch): string {
    if (batch.remainingQuantity <= 0.000001) return 'Đã dùng hết';
    if (batch.isExpired) return 'Đã hết hạn';
    if (batch.isExpiringSoon) return 'Sắp hết hạn';
    return 'Còn hạn';
  }

  usedQuantity(batch: IngredientBatch): number {
    return Math.max(0, Number(batch.receivedQuantity) - Number(batch.remainingQuantity));
  }

  canDeleteBatch(batch: IngredientBatch): boolean {
    return Math.abs(Number(batch.receivedQuantity) - Number(batch.remainingQuantity)) <= 0.000001;
  }
}
