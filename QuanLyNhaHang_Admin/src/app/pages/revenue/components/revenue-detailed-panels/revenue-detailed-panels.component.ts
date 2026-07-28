import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';
import { type ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-revenue-detailed-panels',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './revenue-detailed-panels.component.html',
  styleUrls: ['./revenue-detailed-panels.component.scss']
})
export class RevenueDetailedPanelsComponent implements OnChanges, OnDestroy {
  @Input() isDaily = true;
  @Input() dailyData: any[] = [];
  @Input() monthlyData: any[] = [];
  @Input() byHourData: any[] = [];
  @Input() byDayOfWeekData: any[] = [];
  @Input() byPartySizeData: any[] = [];
  @Input() bestSellersData: any[] = [];
  @Input() forecastData: any = null;
  @Input() aiForecastData: any[] = [];
  @Input() tableTurnover: any = null;
  @Input() queryDays: any = {};

  @Output() mainViewChange = new EventEmitter<boolean>();

  private charts: Record<string, Chart> = {};

  ngOnChanges(changes: SimpleChanges): void {
    setTimeout(() => this.renderAllDetailedCharts(), 0);
  }

  ngOnDestroy(): void {
    Object.values(this.charts).forEach(c => c.destroy());
    this.charts = {};
  }

  setMainView(isDaily: boolean) {
    this.mainViewChange.emit(isDaily);
  }

  turnoverDetails(): any[] {
    const d = this.tableTurnover?.details;
    return Array.isArray(d) ? d : [];
  }

  formatNumber(value: number): string {
    return (value ?? 0).toLocaleString('vi-VN');
  }

  formatMinutes(m: number): string {
    if (m == null || !Number.isFinite(m)) return '—';
    const h = Math.floor(m / 60);
    const min = Math.round(m % 60);
    if (h <= 0) return `${min} phút`;
    return `${h} giờ ${min} phút`;
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

  private renderAllDetailedCharts() {
    this.renderRevenuePanelMainChart();
    
    const best = this.bestSellersData.slice(0, 10);
    this.buildHorizontalBarChart('chartBestDetailed', best.map(row => (row.itemName ?? '—').slice(0, 28)), best.map(row => row.totalQuantity ?? 0), 'Số lượng bán');
    
    this.renderForecastDetailedChart();
  }

  private renderRevenuePanelMainChart() {
    const rows = this.isDaily ? this.dailyData : this.monthlyData;
    const limit = this.isDaily ? 30 : 12;
    const displayed = rows.length > limit ? rows.slice(-limit) : rows;
    const labels = displayed.map(row => this.isDaily ? `${row.day}/${row.month}` : `T${row.month}/${row.year}`);
    this.buildBarChart('chartMainDetailed', labels, displayed.map(row => row.totalRevenue ?? 0), this.isDaily ? 'Doanh thu theo ngày' : 'Doanh thu theo tháng', true, '#60a5fa');
  }

  private renderForecastDetailedChart() {
    const canvasId = 'chartForecastDetailed';
    const hist = this.forecastData?.historicalData ?? [];
    const fut = this.aiForecastData ?? [];
    const norm = (d: string) => (typeof d === 'string' ? d.split('T')[0] : '');
    const allKeys = [
      ...hist.map((h: any) => norm(h.date)),
      ...fut.map((f: any) => norm(f.date))
    ].filter(Boolean);
    const uniqueSorted = [...new Set(allKeys)].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    if (uniqueSorted.length === 0) {
      if (this.charts[canvasId]) this.charts[canvasId].destroy();
      return;
    }
    
    const histMap = new Map<string, number>(hist.map((h: any) => [norm(h.date), Number(h.revenue) || 0]));
    const futMap = new Map<string, number>(fut.map((f: any) => [norm(f.date), Number(f.predictedRevenue) || 0]));
    
    const labels = uniqueSorted.map((k) => {
      const parts = k.split('-');
      return `${parts[2] ?? ''}/${parts[1] ?? ''}`;
    });
    
    const histSeries: (number | null)[] = uniqueSorted.map((k) => histMap.has(k) ? histMap.get(k)! : null);
    const futSeries: (number | null)[] = uniqueSorted.map((k) => futMap.has(k) ? futMap.get(k)! : null);

    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (this.charts[canvasId]) this.charts[canvasId].destroy();
    
    const cfg: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Thực tế',
            data: histSeries,
            borderColor: '#58a6ff',
            backgroundColor: 'rgba(88, 166, 255, 0.15)',
            tension: 0.25,
            fill: true,
            pointHoverRadius: 6,
            pointRadius: 4
          },
          {
            label: 'Dự báo AI',
            data: futSeries,
            borderColor: '#f0883e',
            backgroundColor: 'rgba(240, 136, 62, 0.1)',
            borderDash: [6, 4],
            tension: 0.25,
            fill: false,
            pointHoverRadius: 6,
            pointRadius: 4
          }
        ]
      },
      options: this.baseChartOptions(true)
    };
    this.charts[canvasId] = new Chart(ctx, cfg);
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
          backgroundColor: color + 'bb',
          hoverBackgroundColor: color,
          borderColor: color,
          borderWidth: 1.5,
          borderRadius: 6,
          maxBarThickness: 42
        }]
      },
      options: this.baseChartOptions(yMoney)
    };
    this.charts[canvasId] = new Chart(ctx, cfg);
  }

  private buildHorizontalBarChart(canvasId: string, labels: string[], data: number[], datasetLabel: string) {
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
          backgroundColor: 'rgba(163, 113, 247, 0.75)',
          hoverBackgroundColor: '#a371f7',
          borderColor: '#a371f7',
          borderWidth: 1.5,
          borderRadius: 6,
          maxBarThickness: 28
        }]
      },
      options: {
        indexAxis: 'y',
        ...this.baseChartOptions(false)
      }
    };
    this.charts[canvasId] = new Chart(ctx, cfg);
  }

  private baseChartOptions(yMoney: boolean) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest' as const,
        intersect: true
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(48, 54, 61, 0.8)' },
          border: { display: false },
          ticks: {
            color: '#8b949e',
            callback: (value: string | number) => yMoney ? this.formatMoney(Number(value)) : this.formatNumber(Number(value))
          }
        },
        x: {
          grid: { color: 'rgba(48, 54, 61, 0.8)' },
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
          bodyColor: '#60a5fa',
          borderColor: 'rgba(255, 255, 255, 0.15)',
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: (c: any) => {
              const label = c.dataset.label || '';
              const val = c.parsed.y !== undefined ? c.parsed.y : (c.parsed.x !== undefined ? c.parsed.x : c.raw);
              return ` ${label}: ${yMoney ? this.formatMoney(Number(val)) : this.formatNumber(Number(val))}`;
            }
          }
        }
      }
    };
  }
}
