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
    if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + ' tỷ ₫';
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + ' triệu ₫';
    if (value >= 1_000) return (value / 1_000).toFixed(1) + ' nghìn ₫';
    return value.toLocaleString('vi-VN') + ' ₫';
  }

  private buildBarChart(canvasId: string, labels: string[], data: number[], datasetLabel: string, yMoney: boolean, color = '#1f6feb') {
    if (!labels.length) return;
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    const cfg: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: datasetLabel,
          data,
          backgroundColor: color + 'aa',
          borderColor: color,
          borderWidth: 1,
          borderRadius: 4
        }]
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
              callback: (value) => yMoney ? this.formatMoney(Number(value)) : Number(value).toLocaleString('vi-VN')
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
