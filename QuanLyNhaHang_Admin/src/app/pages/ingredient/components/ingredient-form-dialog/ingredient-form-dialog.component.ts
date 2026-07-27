import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { RippleModule } from 'primeng/ripple';
import { Ingredient } from '../../../../../model/ingredient.model';

@Component({
  selector: 'app-ingredient-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, InputNumberModule, RippleModule],
  templateUrl: './ingredient-form-dialog.component.html',
  styleUrls: ['../../ingredient.scss']
})
export class IngredientFormDialogComponent {
  @Input() visible = false;
  @Input() ingredient: Ingredient = {
    id: 0,
    name: '',
    unit: '',
    rawMaterialCost: 0,
    stockQuantity: 0,
    minStock: 0,
    created: new Date(),
    updated: new Date(),
  };

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<Ingredient>();

  closeDialog() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  saveIngredient() {
    this.save.emit(this.ingredient);
  }
}
