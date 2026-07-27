import { Component, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';
import { type ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-revenue-profit-charts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './revenue-profit-charts.component.html',
  styleUrls: ['./revenue-profit-charts.component.scss']
})
export class RevenueProfitChartsComponent implements OnChanges, OnDestroy {
  @Input() labels: string[] = [];
  @Input() revenueData: number[] = [];
  @Input() profitData: number[] = [];
  @Input() kpiMargin = 0;

  private charts: Record<string, Chart> = {};

  ngOnChanges(changes: SimpleChanges): void {
    setTimeout(() => {
      this.renderMainLineChart();
      this.renderMarginDonutChart();
    }, 0);
  }

  ngOnDestroy(): void {
    this.destroyAllCharts();
  }

  private destroyAllCharts() {
    Object.values(this.charts).forEach((c) => c.destroy());
    this.charts = {};
  }

  private formatMoney(value: number): string {
    if (value == null || value === 0) return '0 ₫';
    if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + ' tỷ ₫';
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + ' triệu ₫';
    if (value >= 1_000) return (value / 1_000).toFixed(1) + ' nghìn ₫';
    return value.toLocaleString('vi-VN') + ' ₫';
  }

  private renderMainLineChart() {
    const id = 'chartMain';
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return;
    if (this.charts[id]) {
      this.charts[id].destroy();
    }

    if (!this.labels || !this.labels.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cfg: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: this.labels,
        datasets: [
          {
            type: 'bar',
            label: 'Doanh thu',
            data: this.revenueData,
            backgroundColor: 'rgba(96, 165, 250, 0.8)',
            borderRadius: 4
          },
          {
            type: 'line',
            label: 'Lợi nhuận',
            data: this.profitData,
            borderColor: '#34d399',
            backgroundColor: '#34d399',
            borderWidth: 2,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(48, 54, 61, 0.8)' },
            border: { display: false },
            ticks: {
              color: '#8b949e',
              callback: (value) => this.formatMoney(Number(value))
            }
          },
          x: {
            grid: { color: 'rgba(48, 54, 61, 0.8)' },
            border: { display: false },
            ticks: { color: '#8b949e' }
          }
        },
        plugins: {
          legend: { labels: { color: '#f0f6fc' } }
        }
      }
    };
    this.charts[id] = new Chart(ctx, cfg);
  }

  private renderMarginDonutChart() {
    const id = 'chartMargin';
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return;
    if (this.charts[id]) {
      this.charts[id].destroy();
    }

    const margin = this.kpiMargin;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cfg: any = {
      type: 'doughnut',
      data: {
        labels: ['Biên lợi nhuận', 'Chi phí'],
        datasets: [{
          data: [margin, Math.max(0, 100 - margin)],
          backgroundColor: ['#60a5fa', '#334155'],
          borderWidth: 0
        } as any]
      },
      options: {
        cutout: '75%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c: any) => `${c.label}: ${c.parsed}%`
            }
          }
        }
      }
    };
    this.charts[id] = new Chart(ctx, cfg);
  }
}
