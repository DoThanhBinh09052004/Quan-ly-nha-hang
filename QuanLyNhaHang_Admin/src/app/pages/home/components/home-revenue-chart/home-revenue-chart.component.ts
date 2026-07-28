import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-home-revenue-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-revenue-chart.component.html',
  styleUrls: ['./home-revenue-chart.component.scss']
})
export class HomeRevenueChartComponent implements OnChanges, OnDestroy {
  @Input() dailyRevenue: any[] = [];
  @Input() forecastData: any = null;
  @Output() viewAll = new EventEmitter<void>();

  private chart: Chart | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dailyRevenue'] || changes['forecastData']) {
      setTimeout(() => this.renderChart(), 0);
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  formatMoney(val: number): string {
    if (val == null || val === 0) return '0 ₫';
    if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(1) + ' tỷ ₫';
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + ' triệu ₫';
    if (val >= 1_000) return (val / 1_000).toFixed(1) + ' nghìn ₫';
    return val.toLocaleString('vi-VN') + ' ₫';
  }

  onViewAllClick() {
    this.viewAll.emit();
  }

  private renderChart() {
    const id = 'homeChartRevenueLine';
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return;

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const hist = this.dailyRevenue.slice(-7);
    if (!hist.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const labels = hist.map(r => `${r.day}/${r.month}`);
    const dataValues = hist.map(r => r.totalRevenue || 0);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Doanh thu thực tế (₫)',
          data: dataValues,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#38bdf8',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#e2e8f0',
            bodyColor: '#38bdf8',
            callbacks: {
              label: (c: any) => ` Doanh thu: ${this.formatMoney(c.parsed.y)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              callback: (val: any) => this.formatMoney(val)
            }
          }
        }
      }
    });
  }
}
