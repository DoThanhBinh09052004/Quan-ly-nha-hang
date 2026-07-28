import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import { Expense } from '../../../../../model/expense.model';

export interface MonthlyExpensePoint {
  label: string;
  yearMonth: string;
  amount: number;
}

@Component({
  selector: 'app-revenue-expense-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './revenue-expense-panel.component.html',
  styleUrls: ['./revenue-expense-panel.component.scss']
})
export class RevenueExpensePanelComponent implements OnChanges, OnDestroy {
  @Input() expenseMonth = '';
  @Input() totalExpense = 0;
  @Input() expenses: Expense[] = [];
  @Input() expenseBreakdown: any[] = [];
  @Input() monthlyExpenseData: MonthlyExpensePoint[] = [];

  @Output() monthChange = new EventEmitter<string>();
  @Output() addClick = new EventEmitter<void>();

  activeDetailTab: 'category' | 'items' = 'category';

  private donutChart: Chart | null = null;
  private barChart: Chart | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['expenseBreakdown'] || changes['monthlyExpenseData'] || changes['expenseMonth']) {
      setTimeout(() => {
        this.renderExpenseDonutChart();
        this.renderMonthlyExpenseBarChart();
      }, 0);
    }
  }

  ngOnDestroy(): void {
    if (this.donutChart) {
      this.donutChart.destroy();
    }
    if (this.barChart) {
      this.barChart.destroy();
    }
  }

  onExpenseMonthChange() {
    this.monthChange.emit(this.expenseMonth);
  }

  openExpenseDialog() {
    this.addClick.emit();
  }

  get averageMonthlyExpense(): number {
    if (!this.monthlyExpenseData || this.monthlyExpenseData.length === 0) return 0;
    const total = this.monthlyExpenseData.reduce((sum, item) => sum + item.amount, 0);
    return Math.round(total / this.monthlyExpenseData.length);
  }

  get topCategory(): { name: string; amount: number } | null {
    if (!this.expenseBreakdown || this.expenseBreakdown.length === 0) return null;
    return this.expenseBreakdown[0];
  }

  getCategoryPercentage(amount: number): number {
    if (!this.totalExpense || this.totalExpense === 0) return 0;
    return Math.round((amount / this.totalExpense) * 100);
  }

  getCategoryColor(index: number): string {
    const colors = ['#60a5fa', '#34d399', '#fb923c', '#a371f7', '#f472b6', '#38bdf8', '#facc15'];
    return colors[index % colors.length];
  }

  formatMoney(value: number): string {
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

  private renderExpenseDonutChart() {
    const id = 'chartExpenseDonut';
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return;
    
    if (this.donutChart) {
      if (!this.expenseBreakdown || !this.expenseBreakdown.length) {
        this.donutChart.destroy();
        this.donutChart = null;
        return;
      }
      this.donutChart.data.labels = this.expenseBreakdown.map(e => e.name);
      this.donutChart.data.datasets[0].data = this.expenseBreakdown.map(e => e.amount);
      this.donutChart.update('none');
      return;
    }

    if (!this.expenseBreakdown || !this.expenseBreakdown.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = ['#60a5fa', '#34d399', '#fb923c', '#a371f7', '#f472b6', '#38bdf8', '#facc15'];

    const cfg: any = {
      type: 'doughnut',
      data: {
        labels: this.expenseBreakdown.map(e => e.name),
        datasets: [{
          data: this.expenseBreakdown.map(e => e.amount),
          backgroundColor: colors.slice(0, this.expenseBreakdown.length),
          borderWidth: 2,
          borderColor: '#1e293b',
          hoverOffset: 8
        }]
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
                const val = c.parsed !== undefined ? c.parsed : c.raw;
                return ` ${c.label}: ${this.formatMoney(val)} (${this.getCategoryPercentage(val)}%)`;
              }
            }
          }
        }
      }
    };
    this.donutChart = new Chart(ctx, cfg);
  }

  private renderMonthlyExpenseBarChart() {
    const id = 'chartMonthlyExpenseBar';
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return;

    if (this.barChart) {
      if (!this.monthlyExpenseData || !this.monthlyExpenseData.length) {
        this.barChart.destroy();
        this.barChart = null;
        return;
      }
      this.barChart.data.labels = this.monthlyExpenseData.map(d => d.label);
      this.barChart.data.datasets[0].data = this.monthlyExpenseData.map(d => d.amount);
      this.barChart.data.datasets[0].backgroundColor = this.monthlyExpenseData.map(d => 
        d.yearMonth === this.expenseMonth ? '#3b82f6' : 'rgba(51, 65, 85, 0.85)'
      );
      this.barChart.data.datasets[0].borderColor = this.monthlyExpenseData.map(d => 
        d.yearMonth === this.expenseMonth ? '#60a5fa' : '#475569'
      );
      this.barChart.update('none');
      return;
    }

    if (!this.monthlyExpenseData || !this.monthlyExpenseData.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const labels = this.monthlyExpenseData.map(d => d.label);
    const dataValues = this.monthlyExpenseData.map(d => d.amount);

    const backgroundColors = this.monthlyExpenseData.map(d => {
      if (d.yearMonth === this.expenseMonth) {
        return '#3b82f6';
      }
      return 'rgba(51, 65, 85, 0.85)';
    });

    const borderColors = this.monthlyExpenseData.map(d => {
      if (d.yearMonth === this.expenseMonth) {
        return '#60a5fa';
      }
      return '#475569';
    });

    const cfg: any = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Chi phí vận hành',
          data: dataValues,
          backgroundColor: backgroundColors,
          hoverBackgroundColor: '#60a5fa',
          borderColor: borderColors,
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 42
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'nearest',
          intersect: true
        },
        onClick: (event: any, elements: any[]) => {
          if (elements && elements.length > 0) {
            const index = elements[0].index;
            const targetPoint = this.monthlyExpenseData[index];
            if (targetPoint && targetPoint.yearMonth) {
              this.expenseMonth = targetPoint.yearMonth;
              this.onExpenseMonthChange();
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#e2e8f0',
            bodyColor: '#34d399',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (c: any) => {
                const val = c.parsed.y !== undefined ? c.parsed.y : c.raw;
                return ` Chi phí: ${this.formatMoney(val)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#8b949e', font: { size: 12 } }
          },
          y: {
            grid: { color: 'rgba(48, 54, 61, 0.8)' },
            ticks: {
              color: '#8b949e',
              font: { size: 11 },
              callback: (val: any) => this.formatMoney(val)
            }
          }
        }
      }
    };
    this.barChart = new Chart(ctx, cfg);
  }
}
