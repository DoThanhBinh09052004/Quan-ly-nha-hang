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

  formatMargin(value: number): string {
    if (value == null || Number.isNaN(value)) return '0';
    return (Math.round(value * 10) / 10).toFixed(1);
  }

  private formatMoney(value: number): string {
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

  private renderMainLineChart() {
    const id = 'chartMain';
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return;

    if (this.charts[id]) {
      if (!this.labels || !this.labels.length) {
        this.charts[id].destroy();
        delete this.charts[id];
        return;
      }
      this.charts[id].data.labels = this.labels;
      this.charts[id].data.datasets[0].data = this.revenueData;
      this.charts[id].data.datasets[1].data = this.profitData;
      this.charts[id].update('none');
      return;
    }

    if (!this.labels || !this.labels.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create glossy linear gradients
    const barGradient = ctx.createLinearGradient(0, 0, 0, 300);
    barGradient.addColorStop(0, 'rgba(96, 165, 250, 0.95)');
    barGradient.addColorStop(1, 'rgba(30, 58, 138, 0.35)');

    const barHoverGradient = ctx.createLinearGradient(0, 0, 0, 300);
    barHoverGradient.addColorStop(0, '#60a5fa');
    barHoverGradient.addColorStop(1, 'rgba(96, 165, 250, 0.7)');

    const lineFillGradient = ctx.createLinearGradient(0, 0, 0, 300);
    lineFillGradient.addColorStop(0, 'rgba(52, 211, 153, 0.3)');
    lineFillGradient.addColorStop(1, 'rgba(52, 211, 153, 0.0)');

    const cfg: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: this.labels,
        datasets: [
          {
            type: 'bar',
            label: 'Doanh thu (Cột xanh)',
            data: this.revenueData,
            backgroundColor: barGradient,
            hoverBackgroundColor: barHoverGradient,
            borderColor: '#60a5fa',
            borderWidth: 1.5,
            borderRadius: 4,
            maxBarThickness: 34
          },
          {
            type: 'line',
            label: 'Lợi nhuận (Đường xanh lá)',
            data: this.profitData,
            borderColor: '#34d399',
            backgroundColor: lineFillGradient,
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointBackgroundColor: '#34d399',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1.5,
            pointHoverRadius: 7,
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          y: {
            grid: { color: 'rgba(48, 54, 61, 0.6)' },
            border: { display: false },
            ticks: {
              color: '#8b949e',
              font: { size: 11 },
              callback: (value) => this.formatMoney(Number(value))
            }
          },
          x: {
            grid: { color: 'rgba(48, 54, 61, 0.4)' },
            border: { display: false },
            ticks: { color: '#8b949e', font: { size: 11 } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#f1f5f9',
            titleFont: { size: 13, weight: 'bold' },
            bodyColor: '#e2e8f0',
            bodyFont: { size: 12 },
            borderColor: 'rgba(255, 255, 255, 0.15)',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
              label: (c: any) => {
                const label = c.dataset.label || '';
                const val = c.parsed.y !== undefined ? c.parsed.y : c.raw;
                return ` ${label}: ${this.formatMoney(val)}`;
              }
            }
          }
        }
      }
    };
    this.charts[id] = new Chart(ctx, cfg);
  }

  private renderMarginDonutChart() {
    const id = 'chartMargin';
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return;

    const margin = Math.max(0, Math.min(100, Math.round((this.kpiMargin || 0) * 10) / 10));
    const cost = Math.max(0, Math.round((100 - margin) * 10) / 10);

    if (this.charts[id]) {
      this.charts[id].data.datasets[0].data = [margin, cost];
      this.charts[id].update('none');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create gradient fill for margin slice
    const marginGrad = ctx.createLinearGradient(0, 0, 200, 200);
    marginGrad.addColorStop(0, '#38bdf8');
    marginGrad.addColorStop(1, '#2563eb');

    const marginHoverGrad = ctx.createLinearGradient(0, 0, 200, 200);
    marginHoverGrad.addColorStop(0, '#7dd3fc');
    marginHoverGrad.addColorStop(1, '#3b82f6');

    const cfg: any = {
      type: 'doughnut',
      data: {
        labels: ['Biên lợi nhuận', 'Tổng chi phí'],
        datasets: [{
          data: [margin, cost],
          backgroundColor: [marginGrad, '#334155'],
          hoverBackgroundColor: [marginHoverGrad, '#475569'],
          borderWidth: 2,
          borderColor: '#0f172a',
          hoverOffset: 8
        } as any]
      },
      options: {
        cutout: '72%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#e2e8f0',
            bodyColor: '#38bdf8',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (c: any) => {
                const label = c.label || '';
                const val = c.parsed !== undefined ? c.parsed : c.raw;
                const note = c.dataIndex === 0 ? '(Lợi nhuận / Doanh thu)' : '(Chi phí / Doanh thu)';
                return ` ${label}: ${this.formatMargin(val)}% ${note}`;
              }
            }
          }
        }
      }
    };
    this.charts[id] = new Chart(ctx, cfg);
  }
}
