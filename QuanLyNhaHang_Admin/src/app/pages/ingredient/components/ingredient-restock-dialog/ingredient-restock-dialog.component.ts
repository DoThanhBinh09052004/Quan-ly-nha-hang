import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { AiIngredientRestockRow } from '../../../../../model/ingredient.model';

@Component({
  selector: 'app-ingredient-restock-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, TableModule],
  templateUrl: './ingredient-restock-dialog.component.html',
  styleUrls: ['../../ingredient.scss']
})
export class IngredientRestockDialogComponent {
  @Input() visible = false;
  @Input() forecastDays = 14;
  @Input() loading = false;
  @Input() restockRows: AiIngredientRestockRow[] = [];

  @Output() visibleChange = new EventEmitter<boolean>();

  closeDialog() {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
