import { Component, OnInit } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { MyData } from '../../my-data';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-revenue',
  templateUrl: './revenue.html',
  imports: [CommonModule],
  styleUrls: ['./revenue.scss']
})
export class RevenueComponent implements OnInit {

  chart: any;
  isDaily = false;
  loading = true;

  totalRevenue: number = 0;
  totalOrders: number = 0;

  constructor(private myData: MyData) {}

  ngOnInit() {
    this.loadMonthlyRevenue();
  }

  formatMoney(value: number): string {
    return value.toLocaleString('vi-VN') + " ₫";
  }

  createChart(labels: string[], data: number[]) {
    if (this.chart) this.chart.destroy();

    this.chart = new Chart("revenueChart", {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Doanh thu (VNĐ)',
          data: data,
          barPercentage: 0.5,
          categoryPercentage: 0.25      
        }]
      },
      options: {
        scales: {
          y: {
            ticks: {
              callback: value => this.formatMoney(Number(value))
            }
          }
        },
        responsive: true,

        plugins: {
          tooltip: {
            callbacks: {
              label: context => this.formatMoney(context.parsed.y as number)
            }
          }
        }
      }
    });
  }

  loadDailyRevenue() {
    this.isDaily = true;
    this.loading = true;

    this.myData.getRevenueDaily().subscribe(res => {
      this.loading = false;
      if (!res?.length) return;

      const labels = res.map(x => `Ngày ${x.day}`);
      const data = res.map(x => x.totalRevenue);

      this.totalRevenue = data.reduce((a, b) => a + b, 0);
      this.totalOrders = res.length;

      this.createChart(labels, data);
    });
  }

  loadMonthlyRevenue() {
    this.isDaily = false;
    this.loading = true;

    this.myData.getRevenueMonthly().subscribe(res => {
      this.loading = false;
      if (!res?.length) return;

      const labels = res.map(x => `Tháng ${x.month}`);
      const data = res.map(x => x.totalRevenue);

      this.totalRevenue = data.reduce((a, b) => a + b, 0);
      this.totalOrders = res.length;

      this.createChart(labels, data);
    });
  }
}
