import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { Ingredient, AiIngredientDailyForecastRow } from '../../../../../model/ingredient.model';

@Component({
  selector: 'app-ingredient-forecast-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, TableModule],
  templateUrl: './ingredient-forecast-dialog.component.html',
  styleUrls: ['../../ingredient.scss']
})
export class IngredientForecastDialogComponent {
  @Input() visible = false;
  @Input() ingredient?: Ingredient;
  @Input() forecastDays = 14;
  @Input() loading = false;
  @Input() forecastRows: AiIngredientDailyForecastRow[] = [];

  @Output() visibleChange = new EventEmitter<boolean>();

  closeDialog() {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
