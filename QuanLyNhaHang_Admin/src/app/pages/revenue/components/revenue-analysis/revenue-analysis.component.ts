import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-revenue-analysis',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './revenue-analysis.component.html',
  styleUrls: ['./revenue-analysis.component.scss']
})
export class RevenueAnalysisComponent {
  @Input() activeTab: 'gross' | 'net' | 'forecast' = 'gross';
  @Input() kpiRevenue = 0;
  @Input() kpiCost = 0;
  @Input() kpiProfit = 0;
  @Input() topSeller: any = null;
  @Input() categoryData: any[] = [];
  @Input() bestSellersData: any[] = [];
  @Input() tableTurnover: any = null;
  @Input() totalCategoryRevenue = 0;

  formatMoney(value: number): string {
    if (value == null || value === 0) return '0 ₫';
    if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + ' tỷ ₫';
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + ' triệu ₫';
    if (value >= 1_000) return (value / 1_000).toFixed(1) + ' nghìn ₫';
    return value.toLocaleString('vi-VN') + ' ₫';
  }

  formatMinutes(m: number): string {
    if (m == null || !Number.isFinite(m)) return '—';
    const h = Math.floor(m / 60);
    const min = Math.round(m % 60);
    if (h <= 0) return `${min} phút`;
    return `${h} giờ ${min} phút`;
  }

  categoryRevenueRate(value: number): number {
    return this.totalCategoryRevenue > 0 ? Math.max(0, Math.min(100, (value / this.totalCategoryRevenue) * 100)) : 0;
  }

  turnoverDetails(): any[] {
    const d = this.tableTurnover?.details;
    return Array.isArray(d) ? d : [];
  }
}
