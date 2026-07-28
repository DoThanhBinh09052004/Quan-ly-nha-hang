import { Component, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';
import { type ChartConfiguration } from 'chart.js';

const DOW_VI: Record<string, string> = {
  Sunday: 'Chủ nhật', Monday: 'Thứ hai', Tuesday: 'Thứ ba',
  Wednesday: 'Thứ tư', Thursday: 'Thứ năm', Friday: 'Thứ sáu', Saturday: 'Thứ bảy'
};

@Component({
  selector: 'app-revenue-insight-charts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './revenue-insight-charts.component.html',
  styleUrls: ['./revenue-insight-charts.component.scss']
})
export class RevenueInsightChartsComponent implements OnChanges, OnDestroy {
  @Input() byHourData: any[] = [];
  @Input() byDowData: any[] = [];
  @Input() byPartySizeData: any[] = [];

  private charts: Record<string, Chart> = {};

  ngOnChanges(changes: SimpleChanges): void {
    setTimeout(() => {
      this.renderByHourChart();
      this.renderByDayOfWeekChart();
      this.renderPartySizeChart();
    }, 0);
  }

  ngOnDestroy(): void {
    Object.values(this.charts).forEach(c => c.destroy());
    this.charts = {};
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

  private buildBarChart(canvasId: string, labels: string[], data: number[], datasetLabel: string, yMoney: boolean, color = '#1f6feb') {
    if (!labels.length) return;
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;
    if (this.charts[canvasId]) {
      this.charts[canvasId].data.labels = labels;
      this.charts[canvasId].data.datasets[0].data = data;
      this.charts[canvasId].update('none');
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create glossy gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 250);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + '22');

    const cfg: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: datasetLabel,
          data,
          backgroundColor: grad,
          hoverBackgroundColor: color,
          borderColor: color,
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'nearest',
          intersect: true
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(48, 54, 61, 0.8)' },
            border: { display: false },
            ticks: {
              color: '#8b949e',
              callback: (value) => yMoney ? this.formatMoney(Number(value)) : Number(value).toLocaleString('vi-VN')
            }
          },
          x: {
            grid: { color: 'rgba(48, 54, 61, 0.4)' },
            border: { display: false },
            ticks: { color: '#8b949e' }
          }
        },
        plugins: {
          legend: { labels: { color: '#f0f6fc', font: { size: 12, weight: 600 } } },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#e2e8f0',
            bodyColor: color,
            borderColor: 'rgba(255, 255, 255, 0.15)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (c: any) => {
                const label = c.dataset.label || '';
                const val = c.parsed.y !== undefined ? c.parsed.y : c.raw;
                return ` ${label}: ${yMoney ? this.formatMoney(Number(val)) : Number(val).toLocaleString('vi-VN')}`;
              }
            }
          }
        }
      }
    };
    this.charts[canvasId] = new Chart(ctx, cfg);
  }

  private renderByHourChart() {
    const rows = [...this.byHourData].sort((a, b) => (a.hour ?? 0) - (b.hour ?? 0));
    const labels = rows.map((r) => `${r.hour ?? 0}h`);
    const data = rows.map((r) => r.totalRevenue ?? 0);
    this.buildBarChart('chartByHour', labels, data, 'Theo giờ', true, '#a371f7');
  }

  private renderByDayOfWeekChart() {
    const rows = [...this.byDowData].sort((a, b) => (a.dayOfWeekValue ?? 0) - (b.dayOfWeekValue ?? 0));
    const labels = rows.map((r) => DOW_VI[r.dayOfWeek] ?? r.dayOfWeek ?? '');
    const data = rows.map((r) => r.totalRevenue ?? 0);
    this.buildBarChart('chartByDow', labels, data, 'Theo thứ trong tuần', true, '#3fb950');
  }

  private renderPartySizeChart() {
    const rows = [...this.byPartySizeData].sort((a, b) => (a.partySize ?? 0) - (b.partySize ?? 0));
    const labels = rows.map((r) => `${r.partySize ?? 0} khách`);
    const data = rows.map((r) => r.totalRevenue ?? 0);
    this.buildBarChart('chartParty', labels, data, 'Theo số khách/bàn', true, '#d29922');
  }
}
