import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-ingredient-toolbar',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './ingredient-toolbar.component.html',
  styleUrls: ['../../ingredient.scss']
})
export class IngredientToolbarComponent {
  @Input() totalIngredients = 0;
  @Input() lowStockCount = 0;
  @Input() totalBatchCount = 0;
  @Input() expiringSoonBatchCount = 0;
  @Input() selectedCount = 0;

  @Output() create = new EventEmitter<void>();
  @Output() forecast = new EventEmitter<void>();
  @Output() deleteSelected = new EventEmitter<void>();
  @Output() reload = new EventEmitter<void>();
}
