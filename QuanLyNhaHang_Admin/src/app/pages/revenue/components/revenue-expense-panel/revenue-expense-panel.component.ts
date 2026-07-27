import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart } from 'chart.js';
import { Expense } from '../../../../../model/expense.model';

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

  @Output() monthChange = new EventEmitter<string>();
  @Output() addClick = new EventEmitter<void>();

  private chart: Chart | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['expenseBreakdown']) {
      setTimeout(() => this.renderExpenseChart(), 0);
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  onExpenseMonthChange() {
    this.monthChange.emit(this.expenseMonth);
  }

  openExpenseDialog() {
    this.addClick.emit();
  }

  formatMoney(value: number): string {
    if (value == null || value === 0) return '0 ₫';
    if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + ' tỷ ₫';
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + ' triệu ₫';
    if (value >= 1_000) return (value / 1_000).toFixed(1) + ' nghìn ₫';
    return value.toLocaleString('vi-VN') + ' ₫';
  }

  private renderExpenseChart() {
    const id = 'chartExpense';
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas || !this.expenseBreakdown.length) return;
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = ['#60a5fa', '#34d399', '#fb923c', '#a371f7', '#f472b6', '#38bdf8'];

    const cfg: any = {
      type: 'doughnut',
      data: {
        labels: this.expenseBreakdown.map(e => e.name),
        datasets: [{
          data: this.expenseBreakdown.map(e => e.amount),
          backgroundColor: colors.slice(0, this.expenseBreakdown.length),
          borderWidth: 0
        } as any]
      },
      options: {
        cutout: '70%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c: any) => `${c.label}: ${this.formatMoney(c.parsed)}`
            }
          }
        }
      }
    };
    this.chart = new Chart(ctx, cfg);
  }
}
