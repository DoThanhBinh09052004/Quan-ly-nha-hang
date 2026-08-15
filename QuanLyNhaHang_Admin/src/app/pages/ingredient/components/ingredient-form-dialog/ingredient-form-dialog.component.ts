import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { RippleModule } from 'primeng/ripple';

import { Ingredient } from '../../../../../model/ingredient.model';

@Component({
  selector: 'app-ingredient-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, InputNumberModule, RippleModule],
  templateUrl: './ingredient-form-dialog.component.html',
  styleUrls: ['../../ingredient.scss'],
})
export class IngredientFormDialogComponent {
  @Input() visible = false;
  @Input() saving = false;
  @Input() ingredient: Ingredient = {
    id: 0,
    name: '',
    unit: '',
    stockQuantity: 0,
    minStock: 0,
    batchCount: 0,
    expiringSoonBatchCount: 0,
    earliestExpirationDate: null,
    created: new Date(),
    updated: new Date(),
  };

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<Ingredient>();

  get invalid(): boolean {
    return !this.ingredient.name.trim()
      || !this.ingredient.unit.trim()
      || Number(this.ingredient.minStock) < 0;
  }

  closeDialog(): void {
    if (this.saving) return;
    this.visible = false;
    this.visibleChange.emit(false);
  }

  saveIngredient(): void {
    if (!this.invalid && !this.saving) {
      this.save.emit(this.ingredient);
    }
  }
}
