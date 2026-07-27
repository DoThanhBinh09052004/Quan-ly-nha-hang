import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-revenue-kpi',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './revenue-kpi.component.html',
  styleUrls: ['./revenue-kpi.component.scss']
})
export class RevenueKpiComponent {
  @Input() reportPeriod: 'daily' | 'monthly' | 'yearly' = 'daily';
  @Input() activeTab: 'gross' | 'net' | 'forecast' = 'gross';
  @Input() kpiRevenue = 0;
  @Input() kpiCost = 0;
  @Input() kpiProfit = 0;
  @Input() kpiMargin = 0;

  @Output() periodChange = new EventEmitter<'daily' | 'monthly' | 'yearly'>();

  setPeriod(period: 'daily' | 'monthly' | 'yearly') {
    this.periodChange.emit(period);
  }

  formatMoney(value: number): string {
    if (value == null || value === 0) return '0 ₫';
    if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + ' tỷ ₫';
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + ' triệu ₫';
    if (value >= 1_000) return (value / 1_000).toFixed(1) + ' nghìn ₫';
    return value.toLocaleString('vi-VN') + ' ₫';
  }
}
