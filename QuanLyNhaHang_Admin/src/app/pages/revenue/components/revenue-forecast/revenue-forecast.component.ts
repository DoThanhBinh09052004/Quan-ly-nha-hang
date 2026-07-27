import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, type ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-revenue-forecast',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './revenue-forecast.component.html',
  styleUrls: ['./revenue-forecast.component.scss']
})
export class RevenueForecastComponent implements OnChanges, OnDestroy {
  @Input() inputDate = '';
  @Input() aiLoading = false;
  @Input() forecastData: any = null;
  @Input() aiForecastData: any[] = [];

  @Output() inputDateChange = new EventEmitter<string>();
  @Output() predictClick = new EventEmitter<string>();

  private chart: Chart | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    setTimeout(() => this.renderForecastChart(), 0);
  }

  ngOnDestroy(): void {
    if (this.chart) this.chart.destroy();
  }

  onDateChange() {
    this.inputDateChange.emit(this.inputDate);
  }

  submitPredict() {
    this.predictClick.emit(this.inputDate);
  }

  private renderForecastChart(canvasId = 'chartForecast') {
    const hist = this.forecastData?.historicalData ?? [];
    const fut = this.aiForecastData ?? [];
    const norm = (d: string) => (typeof d === 'string' ? d.split('T')[0] : '');
    const allKeys = [
      ...hist.map((h: any) => norm(h.date)),
      ...fut.map((f: any) => norm(f.date))
    ].filter(Boolean);
    const uniqueSorted = [...new Set(allKeys)].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    if (uniqueSorted.length === 0) {
      if (this.chart) this.chart.destroy();
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
    if (this.chart) this.chart.destroy();
    
    const formatMoney = (value: number) => {
      if (value == null || value === 0) return '0 ₫';
      if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + ' tỷ ₫';
      if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + ' triệu ₫';
      if (value >= 1_000) return (value / 1_000).toFixed(1) + ' nghìn ₫';
      return value.toLocaleString('vi-VN') + ' ₫';
    };

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
            fill: true
          },
          {
            label: 'Dự báo AI',
            data: futSeries,
            borderColor: '#f0883e',
            backgroundColor: 'rgba(240, 136, 62, 0.1)',
            borderDash: [6, 4],
            tension: 0.25,
            fill: false
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
              callback: (value) => formatMoney(Number(value))
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
    this.chart = new Chart(ctx, cfg);
  }
}
