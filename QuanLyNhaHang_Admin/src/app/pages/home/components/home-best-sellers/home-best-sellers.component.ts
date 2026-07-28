import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-home-best-sellers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-best-sellers.component.html',
  styleUrls: ['./home-best-sellers.component.scss']
})
export class HomeBestSellersComponent implements OnChanges, OnDestroy {
  @Input() bestSellers: any[] = [];
  @Output() viewAll = new EventEmitter<void>();

  private chart: Chart | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bestSellers']) {
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
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + ' triệu ₫';
    if (val >= 1_000) return (val / 1_000).toFixed(1) + ' nghìn ₫';
    return val.toLocaleString('vi-VN') + ' ₫';
  }

  onViewAllClick() {
    this.viewAll.emit();
  }

  private renderChart() {
    const id = 'homeChartBestSellers';
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return;

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    if (!this.bestSellers.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const topItems = this.bestSellers.slice(0, 5);
    const labels = topItems.map(i => (i.itemName || 'Món').slice(0, 20));
    const dataValues = topItems.map(i => i.totalQuantity || 0);

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Số lượng bán',
          data: dataValues,
          backgroundColor: 'rgba(96, 165, 250, 0.7)',
          borderColor: '#60a5fa',
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 28
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#e2e8f0',
            bodyColor: '#60a5fa',
            callbacks: {
              label: (c: any) => ` Đã bán: ${c.parsed.x} phần`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8', font: { size: 11 } }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#e2e8f0', font: { size: 12, weight: 600 } }
          }
        }
      }
    });
  }
}
