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
  @Input() hasRevenue = true;
  @Input() statusMessage = '';

  @Output() periodChange = new EventEmitter<'daily' | 'monthly' | 'yearly'>();

  setPeriod(period: 'daily' | 'monthly' | 'yearly') {
    this.periodChange.emit(period);
  }

  formatMargin(value: number): string {
    if (value == null || Number.isNaN(value)) return '0';
    return (Math.round(value * 10) / 10).toFixed(1);
  }

  formatMoney(value: number): string {
    if (value == null || value === 0) return '0 ₫';
    const isNegative = value < 0;
    const absVal = Math.abs(value);
    let res = '';
    if (absVal >= 1_000_000_000) res = (absVal / 1_000_000_000).toFixed(1) + ' tỷ ₫';
    else if (absVal >= 1_000_000) res = (absVal / 1_000_000).toFixed(1) + ' triệu ₫';
    else if (absVal >= 1_000) res = (absVal / 1_000).toFixed(1) + ' nghìn ₫';
    else res = absVal.toLocaleString('vi-VN') + ' ₫';
    return isNegative ? `-${res}` : res;
  }
}
