import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home-recent-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-recent-orders.component.html',
  styleUrls: ['./home-recent-orders.component.scss']
})
export class HomeRecentOrdersComponent {
  @Input() recentOrders: any[] = [];
  @Output() viewAll = new EventEmitter<void>();

  formatMoney(val: number): string {
    if (val == null || val === 0) return '0 ₫';
    return val.toLocaleString('vi-VN') + ' ₫';
  }

  onViewAllClick() {
    this.viewAll.emit();
  }
}
