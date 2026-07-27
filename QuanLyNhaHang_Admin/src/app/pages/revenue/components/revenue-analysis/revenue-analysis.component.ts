import { Component, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';
import { type ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-revenue-analysis',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './revenue-analysis.component.html',
  styleUrls: ['./revenue-analysis.component.scss']
})
export class RevenueAnalysisComponent implements OnChanges, OnDestroy {
  @Input() activeTab: 'gross' | 'net' | 'forecast' = 'gross';
  @Input() kpiRevenue = 0;
  @Input() kpiCost = 0;
  @Input() kpiProfit = 0;
  @Input() topSeller: any = null;
  @Input() categoryData: any[] = [];
  @Input() bestSellersData: any[] = [];
  @Input() tableTurnover: any = null;
  @Input() totalCategoryRevenue = 0;

  private charts: Record<string, Chart> = {};

  ngOnChanges(changes: SimpleChanges): void {
    setTimeout(() => {
      this.renderBestChart();
    }, 0);
  }

  ngOnDestroy(): void {
    if (this.charts['chartBest']) {
      this.charts['chartBest'].destroy();
    }
  }

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

  private renderBestChart() {
    const id = 'chartBest';
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return;
    if (this.charts[id]) {
      this.charts[id].destroy();
    }

    if (!this.bestSellersData || !this.bestSellersData.length) return;

    const topData = this.bestSellersData.slice(0, 5);
    const labels = topData.map(d => d.itemName);
    const data = topData.map(d => d.totalRevenue);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cfg: any = {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        cutout: '65%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'right',
            labels: { color: '#f0f6fc', font: { size: 11 }, boxWidth: 12 }
          },
          tooltip: {
            callbacks: {
              label: (c: any) => ` ${c.label}: ${this.formatMoney(c.parsed)}`
            }
          }
        }
      }
    };
    this.charts[id] = new Chart(ctx, cfg);
  }
}
