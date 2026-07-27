import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-order-toolbar',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './order-toolbar.component.html',
  styleUrls: ['../../order.scss']
})
export class OrderToolbarComponent {
  @Input() totalRecords = 0;
  @Input() todayRevenue = 0;
  @Input() selectedCount = 0;

  @Output() create = new EventEmitter<void>();
  @Output() deleteSelected = new EventEmitter<void>();
  @Output() exportCSV = new EventEmitter<void>();
  @Output() reload = new EventEmitter<void>();
}
